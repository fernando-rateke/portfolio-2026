/* Dentro das lojas. Cada loja da rua tem a sua sala: cafeteria (Quem sou), Matemática, Linguagens, Ciências
   Humanas, Ciências da Natureza e a loja maior do curso técnico, com um computador para cada matéria.
   Móveis e objetos são prontos (Poly Haven, CC0); as estruturas da sala (balcão, divisória com cortina, janela com
   o céu lá fora, porta do banheiro, vigas, tatame, painéis de papel) são montadas com texturas de verdade.
   A luz principal vem da janela; luminárias quentes e fracas fazem a luz de apoio. Cada sala tem dois ou três
   pontos de vista (setas embaixo, ou as setas do teclado). As atividades ficam em quadros com a imagem inteira
   (sem cortar), num passe-partout de papel; tocar no quadro (ou no nome aceso) abre a atividade.
   Cada sala só é baixada na primeira vez que alguém entra. */
(() => {
  const M = (window.MUNDO = window.MUNDO || {});
  M.builders = M.builders || [];
  M.builders.push(async (M) => {
    const { T, renderer, texL } = M;
    const V3 = (x, y, z) => new T.Vector3(x, y, z);
    const loader = new T.GLTFLoader(); if (window.MeshoptDecoder) loader.setMeshoptDecoder(window.MeshoptDecoder);
    const cache = {};
    const modelo = (n) => cache[n] || (cache[n] = new Promise((ok) => loader.load("/cidade/interior/" + n + ".glb", (g) => ok(g.scene), undefined, () => ok(null))));
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const imgUrl = (u) => (!u ? "" : /^https?:|^\//.test(u) ? u : "/vale/" + u);
    let semente = 7; const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647;

    /* ---------- materiais das estruturas ---------- */
    const mats = {};
    const mat = (k, f) => mats[k] || (mats[k] = f());
    const MADEIRA = () => mat("mad", () => M.pbr("hinoki_planks", [1, 1], { metalness: 0, color: "#c8a888" }));
    const ESCURA = () => mat("esc", () => M.pbr("dark_wooden_planks", [1, 1], { metalness: 0, color: "#8a6a58" }));
    const box = (g, w, h, d, m, x, y, z, ry = 0) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.y = ry; g.add(o); return o; };
    const papelTex = M.canvasTex(256, 256, (c, w, h) => { c.fillStyle = "#f4e8d0"; c.fillRect(0, 0, w, h); c.fillStyle = "#3a2618"; for (let x = 0; x <= w; x += 51) c.fillRect(x - 3, 0, 6, h); for (let y = 0; y <= h; y += 36) c.fillRect(0, y - 2, w, 4); c.fillRect(0, 0, w, 8); c.fillRect(0, h - 8, w, 8); });
    const PAPEL = () => mat("papel", () => new T.MeshStandardMaterial({ map: papelTex, emissiveMap: papelTex, emissive: new T.Color("#ffc890"), emissiveIntensity: 0.18, roughness: 0.9 }));

    /* ---------- a caixa da sala ---------- */
    function sala(cfg) {
      const g = new T.Group(), { W, D, H } = cfg;
      const piso = new T.Mesh(new T.PlaneGeometry(W, D), M.pbr(cfg.piso, [W / 2, D / 2], { metalness: 0, color: cfg.corPiso || "#ffffff" })); piso.rotation.x = -Math.PI / 2; g.add(piso);
      const pm = M.pbr(cfg.parede, [W / 2.5, H / 2.5], { metalness: 0, color: cfg.corParede || "#ffffff" });
      const parede = (w, x, z, ry) => { const p = new T.Mesh(new T.PlaneGeometry(w, H), pm); p.position.set(x, H / 2, z); p.rotation.y = ry; g.add(p); };
      parede(W, 0, -D / 2, 0); parede(D, -W / 2, 0, Math.PI / 2); parede(D, W / 2, 0, -Math.PI / 2); parede(W, 0, D / 2, Math.PI);
      const teto = new T.Mesh(new T.PlaneGeometry(W, D), M.pbr("japanese_cedar_planks", [W / 2, D / 2], { metalness: 0, color: "#6a5040" })); teto.rotation.x = Math.PI / 2; teto.position.y = H; g.add(teto);
      // vigas de madeira no teto
      for (let x = -W / 2 + 1.2; x < W / 2 - 0.5; x += 1.6) box(g, 0.16, 0.2, D, ESCURA(), x, H - 0.1, 0);
      // rodapé e a faixa de madeira na altura da mão, nas quatro paredes
      for (const [w, x, z, ry] of [[W, 0, -D / 2 + 0.02, 0], [D, -W / 2 + 0.02, 0, Math.PI / 2], [D, W / 2 - 0.02, 0, -Math.PI / 2], [W, 0, D / 2 - 0.02, Math.PI]])
        for (const [y, hh] of [[0.08, 0.16], [0.92, 0.05]]) box(g, w, hh, 0.04, ESCURA(), x, y, z, ry);
      return g;
    }
    // janela: moldura, vidro e o céu lá fora (do tema atual); a luz da janela entra na sala
    function janela(g, x, z, ry, w = 1.4, h = 1.05, y = 1.55) {
      const j = new T.Group(); j.position.set(x, y, z); j.rotation.y = ry; g.add(j);
      const ceu = (M.ceu[M.tema === "noite" ? "noite" : "entardecer"] || M.ceu.entardecer || {}).fundo;
      const fora = new T.MeshBasicMaterial({ color: "#ffffff" }); if (ceu) { const t = ceu.clone(); t.needsUpdate = true; t.mapping = T.UVMapping; t.repeat.set(0.1, 0.2); t.offset.set(0.16, 0.44); fora.map = t; }
      const vidro = new T.Mesh(new T.PlaneGeometry(w, h), fora); vidro.position.z = 0.01; j.add(vidro);
      for (const [bw, bh, bx, by] of [[w + 0.16, 0.08, 0, h / 2 + 0.04], [w + 0.16, 0.1, 0, -h / 2 - 0.05], [0.08, h, -w / 2 - 0.04, 0], [0.08, h, w / 2 + 0.04, 0], [0.04, h, 0, 0], [w, 0.03, 0, 0]]) box(j, bw, bh, 0.08, ESCURA(), bx, by, 0.04);
      box(j, w + 0.3, 0.05, 0.2, ESCURA(), 0, -h / 2 - 0.12, 0.1); // peitoril
      return j;
    }
    // porta (do banheiro, do depósito...) com plaquinha
    function porta(g, x, z, ry, texto) {
      const p = new T.Group(); p.position.set(x, 0, z); p.rotation.y = ry; g.add(p);
      box(p, 0.86, 2.0, 0.05, MADEIRA(), 0, 1.0, 0.03); for (const [w, h, px, py] of [[1.0, 0.07, 0, 2.04], [0.07, 2.04, -0.465, 1.02], [0.07, 2.04, 0.465, 1.02]]) box(p, w, h, 0.09, ESCURA(), px, py, 0.04);
      const m = new T.Mesh(new T.SphereGeometry(0.035, 12, 8), new T.MeshStandardMaterial({ color: "#b89a60", metalness: 0.8, roughness: 0.35 })); m.position.set(0.33, 1.0, 0.09); p.add(m);
      if (texto) { const t = M.canvasTex(256, 96, (c, w, h) => { c.fillStyle = "#2a2220"; c.fillRect(0, 0, w, h); c.fillStyle = "#f2e6d0"; c.font = `600 44px ${M.JPS}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(texto, w / 2, h / 2 + 2); });
        const pl = new T.Mesh(new T.PlaneGeometry(0.34, 0.13), new T.MeshStandardMaterial({ map: t, roughness: 0.6 })); pl.position.set(0, 1.62, 0.065); p.add(pl); }
      return p;
    }
    // balcão: corpo de madeira clara com tampo escuro
    function balcao(g, x, z, comp, ry = 0, alt = 1.0) { const b = new T.Group(); b.position.set(x, 0, z); b.rotation.y = ry; g.add(b);
      box(b, comp, alt - 0.05, 0.55, MADEIRA(), 0, (alt - 0.05) / 2, 0); box(b, comp + 0.08, 0.05, 0.68, ESCURA(), 0, alt - 0.025, 0.04); return b; }
    // divisória com passagem e a cortina de pano (noren) na passagem; atrás fica um cômodo mais escuro
    function divisoria(g, W, z, H, vao, vaoW, pm, texto, cor) {
      const esq = (vao - vaoW / 2) - -W / 2, dir = W / 2 - (vao + vaoW / 2);
      if (esq > 0.05) box(g, esq, H, 0.12, pm, -W / 2 + esq / 2, H / 2, z); if (dir > 0.05) box(g, dir, H, 0.12, pm, W / 2 - dir / 2, H / 2, z);
      box(g, vaoW, H - 2.05, 0.12, pm, vao, 2.05 + (H - 2.05) / 2, z);
      for (const sx of [-1, 1]) box(g, 0.08, 2.05, 0.16, ESCURA(), vao + sx * vaoW / 2, 1.02, z); box(g, vaoW + 0.16, 0.08, 0.16, ESCURA(), vao, 2.07, z);
      const t = M.canvasTex(512, 256, (c, w, h) => { c.fillStyle = cor; c.fillRect(0, 0, w, h); c.fillStyle = "#f4efe4"; c.font = `700 130px ${M.JP}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(texto, w / 2, h / 2 + 8); });
      for (let k = 0; k < 2; k++) { const geo = new T.PlaneGeometry(vaoW / 2 - 0.03, 0.75); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (k + uv.getX(i)) / 2);
        const n = new T.Mesh(geo, new T.MeshStandardMaterial({ map: t, side: T.DoubleSide, roughness: 0.9 })); n.position.set(vao - vaoW / 4 + k * vaoW / 2, 2.03 - 0.375, z + 0.09); g.add(n); }
    }
    function shoji(g, x, z, w, h, ry, y0 = 0.1) { const s = new T.Mesh(new T.PlaneGeometry(w, h), PAPEL()); s.position.set(x, y0 + h / 2, z); s.rotation.y = ry; g.add(s); return s; }
    async function por(g, n, x, y, z, ry = 0, s = 1) {
      const m = await modelo(n); if (!m) return null; const o = m.clone(true); o.position.set(x, y, z); o.rotation.y = ry; o.scale.setScalar(s);
      o.traverse((c) => { if (c.isMesh) c.material = c.material.clone(); }); g.add(o); return o;
    }
    const trocar = (o, re, fn) => { if (o) o.traverse((c) => { if (c.isMesh && re.test(c.material.name || "")) fn(c); }); };

    /* ---------- texturas: a atividade inteira no quadro, cartões, tela de PC, giz ---------- */
    function uvPlano(mesh, espelhar) {
      const g = mesh.geometry; if (g.userData.uvPlano) return g.userData.uvPlano;
      const P = M.lerF(g.attributes.position), n = P.length / 3, mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[i * 3 + k]); mx[k] = Math.max(mx[k], P[i * 3 + k]); }
      const ext = [0, 1, 2].map((k) => mx[k] - mn[k]); const eu = ext[0] >= ext[2] ? 0 : 2, ev = 1;
      const uv = new Float32Array(n * 2); for (let i = 0; i < n; i++) { let u = (P[i * 3 + eu] - mn[eu]) / (ext[eu] || 1); if (espelhar) u = 1 - u; uv[i * 2] = u; uv[i * 2 + 1] = (P[i * 3 + ev] - mn[ev]) / (ext[ev] || 1); }
      g.setAttribute("uv", new T.BufferAttribute(uv, 2)); const s0 = new T.Vector3(); mesh.getWorldScale(s0);
      const ra = (ext[eu] * (eu === 0 ? s0.x : s0.z)) / Math.max(1e-6, ext[ev] * s0.y); g.userData.uvPlano = ra || 1; return g.userData.uvPlano;
    }
    // a imagem cabe inteira (nada é cortado), com uma margem de papel em volta, como um passe-partout
    function imagemNoQuadro(mesh, url, titulo, corpo) {
      const fa = uvPlano(mesh), Wc = 1024, Hc = Math.round(Wc / fa);
      const pronto = (tex) => { tex.encoding = T.sRGBEncoding; tex.anisotropy = 4; mesh.material = new T.MeshStandardMaterial({ map: tex, roughness: 0.65, emissive: new T.Color("#ffffff"), emissiveMap: tex, emissiveIntensity: 0.06 }); };
      const comCartao = () => pronto(cartao(titulo, corpo, fa));
      if (!url) return comCartao();
      const img = new Image(); img.crossOrigin = "anonymous";
      img.onload = () => { try { pronto(M.canvasTex(Wc, Hc, (c, w, h) => { c.fillStyle = "#f1e8d6"; c.fillRect(0, 0, w, h); const m = Math.min(w, h) * 0.07, s = Math.min((w - 2 * m) / img.width, (h - 2 * m) / img.height);
        const iw = img.width * s, ih = img.height * s, x = (w - iw) / 2, y = (h - ih) / 2; c.fillStyle = "rgba(60,40,30,.25)"; c.fillRect(x - 3, y - 3, iw + 6, ih + 6); c.drawImage(img, x, y, iw, ih); })); } catch (e) { comCartao(); } };
      img.onerror = comCartao; img.src = imgUrl(url);
    }
    function cartao(titulo, corpo, fa = 0.75) {
      const W0 = 512, H0 = Math.round(W0 / fa);
      return M.canvasTex(W0, H0, (c, w, h) => { c.fillStyle = "#efe4cc"; c.fillRect(0, 0, w, h); c.strokeStyle = "#b5301b"; c.lineWidth = 6; c.strokeRect(18, 18, w - 36, h - 36);
        const quebra = (txt, max) => { const out = []; let l = ""; for (const p of String(txt || "").split(/\s+/)) { if (c.measureText(l + " " + p).width > max && l) { out.push(l); l = p; } else l = l ? l + " " + p : p; } if (l) out.push(l); return out; };
        c.fillStyle = "#2a2220"; c.textAlign = "center"; c.font = `600 44px ${M.JP}`; const tl = quebra(titulo, w - 90).slice(0, 3); tl.forEach((l, i) => c.fillText(l, w / 2, 90 + i * 52));
        c.fillStyle = "#b5301b"; c.fillRect(w / 2 - 44, 90 + tl.length * 52 - 22, 88, 3);
        if (corpo) { c.fillStyle = "#4a3a32"; c.font = `26px ${M.JP}`; const max = Math.max(2, Math.floor((h - 130 - tl.length * 52) / 34)); quebra(corpo, w - 90).slice(0, max).forEach((l, i) => c.fillText(l, w / 2, 118 + tl.length * 52 + i * 34)); } });
    }
    function telaPC(nome, kanji, cor) {
      return M.canvasTex(512, 384, (c, w, h) => { c.fillStyle = "#0e1420"; c.fillRect(0, 0, w, h); c.fillStyle = cor; c.fillRect(0, 0, w, 34); c.fillStyle = "#0e1420"; c.font = "600 18px monospace"; c.fillText("  " + nome, 8, 23);
        c.font = `700 120px ${M.JPS}`; c.fillStyle = cor; c.globalAlpha = 0.9; c.textAlign = "center"; c.fillText(kanji, w / 2, 210); c.globalAlpha = 1; c.textAlign = "left";
        c.font = "15px monospace"; ["$ abrir atividades", "> carregando...", "> pronto", "_"].forEach((l, i) => { c.fillStyle = i === 2 ? "#7fe08a" : "#a8b8d0"; c.fillText(l, 22, 280 + i * 22); }); });
    }
    function giz() {
      return M.canvasTex(640, 1024, (c, w, h) => { c.fillStyle = "#24302a"; c.fillRect(0, 0, w, h); c.strokeStyle = "rgba(240,240,230,.85)"; c.fillStyle = "rgba(240,240,230,.9)"; c.lineWidth = 3;
        c.font = `700 90px ${M.JPS}`; c.fillText("数学", 40, 120); c.font = "italic 46px Georgia, serif";
        ["f(x) = ax² + bx + c", "Δ = b² − 4ac", "x = (−b ± √Δ) / 2a", "a² + b² = c²", "π ≈ 3,14159"].forEach((l, i) => c.fillText(l, 40, 230 + i * 82));
        c.beginPath(); c.moveTo(60, 960); c.lineTo(580, 960); c.moveTo(80, 990); c.lineTo(80, 700); c.stroke(); c.beginPath(); for (let x = 0; x <= 460; x += 4) { const y = 950 - Math.pow((x - 230) / 55, 2) * 14 - 10; x ? c.lineTo(90 + x, y) : c.moveTo(90 + x, y); } c.stroke(); });
    }

    /* ---------- quadros e luminárias ---------- */
    const KANJI = { perfil: ["喫茶", "#2a3a5a"], natureza: ["理科", "#2a6a46"], humanas: ["社会", "#5a3a22"], linguagens: ["国語", "#8a6a3a"], matematica: ["数学", "#2a4a8a"], tecnico: ["技術", "#1a7a8a"],
      modelagem: ["設計", "#7a5a2a"], desenvolvimento: ["開発", "#c8281e"], "programacao-aplicativos": ["アプリ", "#c89a20"], iot: ["電子", "#5a3a9a"], banco: ["データ", "#b5301b"] };
    M.KANJI = KANJI;
    // as paredes de uma sala W x D (para posicionar quadros): costas, esquerda, direita, frente
    const PAR = (W, D) => ({ fundo: (x, y = 1.6) => [x, y, -D / 2 + 0.05, 0], esq: (z, y = 1.6) => [-W / 2 + 0.05, y, z, Math.PI / 2], dir: (z, y = 1.6) => [W / 2 - 0.05, y, z, -Math.PI / 2], frente: (x, y = 1.6) => [x, y, D / 2 - 0.05, Math.PI] });
    async function quadros(g, id, sub, alvos, vagas, modeloQ = "hanging_picture_frame_02", esc0 = 1.5) {
      await Promise.all(sub.acts.map(async (a, i) => { const v = vagas[i % vagas.length]; if (!v) return; const [x, y, z, ry, s] = v; const q = await por(g, v[5] || modeloQ, x, y, z, ry, s || esc0); if (!q) return;
        trocar(q, /artwork|canvas/, (c) => imagemNoQuadro(c, a.img, a.t, a.r)); trocar(q, /glass/, (c) => { c.visible = false; });
        q.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(q);
        alvos.push({ obj: q, nome: a.t, acao: () => M.abrirAtividade(id, i), topo: V3((bb.min.x + bb.max.x) / 2, bb.max.y + 0.1, (bb.min.z + bb.max.z) / 2) }); }));
    }
    // luminária de apoio: luz quente, fraca e de alcance curto (as fontes visíveis da sala)
    const apoio = (cena, x, y, z, i = 0.7, d = 4.5, cor = "#ffb468") => { const l = new T.PointLight(cor, i, d, 2); l.position.set(x, y, z); cena.add(l); return l; };

    /* ---------- as salas ---------- */
    const SALAS = {
      perfil: { titulo: "A cafeteria", W: 6.4, D: 5.6, H: 2.9, piso: "wood_floor", corPiso: "#c8b0a0", parede: "beige_wall_001", corParede: "#d8c0a4",
        vistas: [[V3(-0.3, 1.6, 2.2), V3(0, 1.35, -2.8)], [V3(-2.4, 1.5, 1.6), V3(2.2, 1.1, -1.2)], [V3(1.2, 1.55, 1.0), V3(-1.2, 1.5, -2.8)]],
        janela: [-3.18, -0.4, Math.PI / 2], apoio: [[0.9, 2.3, -1.2], [-1.6, 2.2, 0.3]],
        async montar(g, sub, alvos, P) {
          balcao(g, 1.9, -0.9, 2.6, Math.PI / 2, 1.0); porta(g, 2.55, -2.78, 0, "お手洗い"); janela(g, -3.18, -0.4, Math.PI / 2);
          await Promise.all([por(g, "CoffeeCart_01", 2.85, 0, 0.9, -Math.PI / 2, 0.75), por(g, "CashRegister_01", 1.95, 1.0, -1.7, -Math.PI / 2, 0.75), por(g, "vintage_electric_kettle", 1.9, 1.0, -0.3, -1.2, 1),
            por(g, "bar_chair_round_01", 1.25, 0, -1.6, 1.2, 1), por(g, "bar_chair_round_01", 1.25, 0, -0.6, 1.8, 1), por(g, "bar_chair_round_01", 1.25, 0, 0.3, 1.4, 1),
            por(g, "round_wooden_table_01", -1.8, 0, 0.3, 0, 0.72), por(g, "tea_set_01", -1.8, 0.72, 0.3, 0.6, 0.85), por(g, "chinese_armchair", -2.4, 0, 1.3, 2.4, 0.9), por(g, "chinese_armchair", -1.0, 0, -0.5, -0.6, 0.9),
            por(g, "chinese_chandelier", -1.8, 2.9, 0.3, 0, 0.8), por(g, "potted_plant_04", -2.95, 1.05, -0.4, 0, 1.6), por(g, "ceramic_vase_01", -2.9, 0, 2.4, 0, 2)]);
          await quadros(g, "perfil", sub, alvos, [P.fundo(-1.4, 1.6), P.fundo(0.4, 1.6)], "hanging_picture_frame_01", 1.5);
        } },
      matematica: { titulo: "A sala de Matemática", W: 6.4, D: 5.6, H: 2.9, piso: "dark_wooden_planks", corPiso: "#b8a090", parede: "white_plaster_02", corParede: "#d8d2c4",
        vistas: [[V3(0.3, 1.6, 2.2), V3(-0.4, 1.3, -2.8)], [V3(2.4, 1.5, 1.6), V3(-2.4, 1.2, -1.4)], [V3(-1.6, 1.55, 0.6), V3(3.2, 1.5, -0.6)]],
        janela: [-3.18, 0.2, Math.PI / 2], apoio: [[0, 2.3, -0.6], [-1.6, 2.2, -1.6]],
        async montar(g, sub, alvos, P) {
          porta(g, 2.4, -2.78, 0, "準備室"); janela(g, -3.18, 0.4, Math.PI / 2);
          const lousa = await por(g, "standing_chalkboard_01", -1.4, 0, -2.0, 0.25, 1.35); trocar(lousa, /board/, (c) => { uvPlano(c); c.material = new T.MeshStandardMaterial({ map: giz(), roughness: 0.9, side: T.DoubleSide }); });
          await Promise.all([por(g, "painted_wooden_table", 0.3, 0, -0.3, 0, 0.75), por(g, "chess_set", -0.1, 0.72, -0.3, 0.3, 0.9), por(g, "binder_notebook", 0.75, 0.72, -0.4, -0.2, 1), por(g, "stationery_supplies", 0.95, 0.79, -0.15, 0.4, 1),
            por(g, "SchoolChair_01", -0.3, 0, 0.7, Math.PI, 1), por(g, "SchoolChair_01", 0.9, 0, 0.7, Math.PI + 0.2, 1), por(g, "Shelf_01", 3.05, 0, -1.4, -Math.PI / 2, 1),
            por(g, "book_encyclopedia_set_01", 3.05, 1.02, -1.6, -Math.PI / 2, 1), por(g, "book_encyclopedia_set_01", 3.05, 1.5, -1.6, -Math.PI / 2, 1),
            por(g, "desk_lamp_arm_01", 1.05, 0.72, -0.5, -0.6, 1), por(g, "potted_plant_04", -2.95, 1.05, 0.4, 0, 1.6)]);
          await quadros(g, "matematica", sub, alvos, [P.fundo(0.6), P.dir(0.4), P.dir(1.8), P.fundo(1.2, 2.2)]);
        } },
      linguagens: { titulo: "A livraria de Linguagens", W: 6.4, D: 6.0, H: 2.9, piso: "wood_floor", corPiso: "#b8a090", parede: "painted_plaster_wall", corParede: "#d4c4ae",
        vistas: [[V3(0, 1.6, 2.4), V3(0, 1.35, -3)], [V3(0.6, 1.55, -1.2), V3(-0.4, 1.2, -3)], [V3(-0.6, 1.6, 0.4), V3(1.2, 1.5, 3)]],
        janela: [-3.18, -2.2, Math.PI / 2], apoio: [[1.4, 2.2, 1.6], [-0.8, 2.2, -2.2], [0, 2.2, 0.6]],
        async montar(g, sub, alvos, P) {
          const pm = M.pbr("painted_plaster_wall", [2, 1.2], { metalness: 0, color: "#c8b8a0" });
          divisoria(g, 6.4, -1.0, 2.9, 0.4, 1.3, pm, "文", "#3a4a5a"); janela(g, -3.18, -2.1, Math.PI / 2, 1.1, 0.9); porta(g, 2.4, -2.98, 0, "お手洗い");
          balcao(g, 1.9, 1.6, 1.6, 0, 1.0);
          const est = [por(g, "wooden_bookshelf_worn", -2.85, 0, 0.2, Math.PI / 2, 0.95), por(g, "wooden_bookshelf_worn", -2.85, 0, 1.6, Math.PI / 2, 0.95), por(g, "wooden_bookshelf_worn", 2.85, 0, -0.1, -Math.PI / 2, 0.95)];
          await Promise.all(est);
          for (const [x, z, ry] of [[-2.85, 0.2, Math.PI / 2], [-2.85, 1.6, Math.PI / 2], [2.85, -0.1, -Math.PI / 2]]) for (const y of [0.4, 0.86, 1.32]) for (const dz of [-0.33, 0.24]) await por(g, "book_encyclopedia_set_01", x, y, z + dz, ry, 0.95);
          await Promise.all([por(g, "CashRegister_01", 1.6, 1.0, 1.55, Math.PI, 0.7), por(g, "vintage_oil_lamp", 2.4, 1.0, 1.55, 0, 0.6), por(g, "book_encyclopedia_set_01", 1.95, 1.0, 1.5, 0.3, 0.8),
            por(g, "ArmChair_01", -1.4, 0, -2.2, 0.7, 1), por(g, "side_table_01", -0.6, 0, -2.5, 0, 1), por(g, "desk_lamp_arm_01", -0.6, 0.55, -2.5, 0.8, 0.8), por(g, "potted_plant_04", 1.4, 0, -2.6, 0, 2.6)]);
          await quadros(g, "linguagens", sub, alvos, [P.fundo(-0.9), P.fundo(1.0), [-1.9, 1.6, -0.93, 0], [1.9, 1.6, -0.93, 0], P.frente(-1.6), P.frente(0.4), P.dir(1.3)], "hanging_picture_frame_02", 1.35);
        } },
      humanas: { titulo: "O antiquário de Ciências Humanas", W: 6.4, D: 5.6, H: 2.9, piso: "tatami_mat", corPiso: "#c8bca0", parede: "beige_wall_001", corParede: "#c8b498",
        vistas: [[V3(0, 1.6, 2.2), V3(0, 1.3, -2.8)], [V3(-2.3, 1.45, 1.4), V3(1.6, 1.1, -1.6)], [V3(1.4, 1.5, 0.8), V3(-3.2, 1.4, -0.2)]],
        janela: null, apoio: [[0, 2.3, -1.4], [-1.8, 2.0, 1.0], [2.0, 2.0, 0.4]],
        async montar(g, sub, alvos, P) {
          // um estrado de tatame no fundo, painéis de papel acesos na parede esquerda e a porta do depósito
          box(g, 6.36, 0.3, 1.6, M.pbr("tatami_mat", [3, 1], { metalness: 0, color: "#d8cca8" }), 0, 0.15, -2.0); box(g, 6.36, 0.06, 0.08, ESCURA(), 0, 0.31, -1.2);
          for (const z of [-1.0, 0.0, 1.0, 2.0]) shoji(g, -3.16, z, 0.95, 1.9, Math.PI / 2, 0.15); porta(g, 2.6, 2.78, Math.PI, "倉庫");
          await Promise.all([por(g, "chinese_cabinet", -2.6, 0.3, -2.45, 0.2, 0.75), por(g, "chinese_cabinet", 2.6, 0.3, -2.45, -0.2, 0.75), por(g, "chinese_commode", 0, 0.3, -2.15, 0, 0.42),
            por(g, "marble_bust_01", -0.5, 1.15, -2.15, 0.3, 1.2), por(g, "mantel_clock_01", 0.35, 1.15, -2.15, -0.2, 1.3), por(g, "seadogs_compass", 0.75, 1.15, -2.05, 0.6, 2), por(g, "antique_ceramic_vase_01", -0.95, 1.15, -2.1, 0, 1.2),
            por(g, "vintage_binocular", 0.95, 1.17, -2.25, 0.4, 1.4), por(g, "vintage_suitcase", -1.6, 0, 1.4, 0.4, 0.8), por(g, "chinese_armchair", 2.2, 0, 1.0, -2.4, 0.9), por(g, "chinese_tea_table", 1.4, 0, 1.4, 0.2, 0.9),
            por(g, "chinese_chandelier", 0, 2.9, -0.6, 0, 0.8), por(g, "vintage_oil_lamp", 1.4, 0.45, 1.4, 0, 0.7)]);
          await quadros(g, "humanas", sub, alvos, [P.dir(-1.4), P.dir(-0.1), P.dir(1.2), P.fundo(-1.6, 1.9), P.fundo(1.6, 1.9), P.frente(-1.2)], "fancy_picture_frame_01", 1.9);
        } },
      natureza: { titulo: "O laboratório de Ciências da Natureza", W: 6.4, D: 5.6, H: 2.9, piso: "wood_floor", corPiso: "#c0b4a4", parede: "white_plaster_02", corParede: "#d4dcd0",
        vistas: [[V3(0, 1.6, 2.2), V3(0, 1.2, -2.8)], [V3(-2.2, 1.5, 1.5), V3(2.0, 1.3, -1.4)], [V3(1.4, 1.55, 0.6), V3(-3.2, 1.5, -0.6)]],
        janela: [-3.18, -0.6, Math.PI / 2], apoio: [[0, 2.2, -1.9], [1.8, 2.2, 0.4]],
        async montar(g, sub, alvos, P) {
          // a bancada do laboratório no fundo, a janela com plantas e a porta da sala de amostras
          balcao(g, -0.4, -2.45, 4.0, 0, 0.92); janela(g, -3.18, -0.6, Math.PI / 2); porta(g, 2.55, -2.78, 0, "標本室");
          await Promise.all([por(g, "vintage_microscope", -1.4, 0.92, -2.4, 0.5, 1.4), por(g, "wicker_basket_02", -0.6, 0.92, -2.35, 0.2, 1.2), por(g, "potted_plant_04", 0.1, 0.92, -2.45, 0, 1.5),
            por(g, "ceramic_vase_03", 0.6, 0.92, -2.45, 0, 0.7), por(g, "ceramic_vase_01", 0.95, 0.92, -2.4, 0, 0.7), por(g, "desk_lamp_arm_01", -2.0, 0.92, -2.45, 0.5, 0.9),
            por(g, "planter_box_02", -2.8, 0, -0.6, Math.PI / 2, 0.9), por(g, "painted_wooden_table", 0.4, 0, 0.4, 0, 0.7), por(g, "potted_plant_04", 0.1, 0.67, 0.4, 0, 1.4), por(g, "vintage_microscope", 0.7, 0.67, 0.35, -0.4, 1.2),
            por(g, "wooden_display_shelves_01", 2.95, 0, 0.9, Math.PI, 1.1)]);
          for (const dz of [-0.35, 0, 0.35]) await por(g, "potted_plant_04", -2.8 + (rnd() - 0.5) * 0.1, 0.4, -0.6 + dz, rnd() * 6, 1.9);
          for (const dz of [-0.3, 0.3]) await por(g, "potted_plant_04", 2.95, 1.72, 0.9 + dz, rnd() * 6, 1.6);
          await quadros(g, "natureza", sub, alvos, [P.dir(-1.4), P.dir(-0.2), P.dir(2.0, 1.7), P.frente(-1.5), P.frente(0.3), P.esq(1.4), P.esq(2.5), P.fundo(1.0, 2.0)], "hanging_picture_frame_02", 1.3);
        } },
      tecnico: { titulo: "O laboratório do curso técnico", W: 9, D: 6.6, H: 3.1, piso: "wood_floor", corPiso: "#a8a4a0", parede: "white_plaster_02", corParede: "#cdd2d8", tech: true,
        vistas: [[V3(0, 1.65, 2.8), V3(0, 1.1, -3.3)], [V3(-3.2, 1.55, 1.6), V3(2.6, 1.0, -2.2)], [V3(3.2, 1.55, 1.6), V3(-2.6, 1.0, -2.2)]],
        janela: [-4.48, 0.6, Math.PI / 2], apoio: [[-2.4, 2.9, -1.4], [2.4, 2.9, -1.4], [0, 2.9, 1.2]], corApoio: "#dce8ff",
        async montar(g, sub, alvos, P) {
          janela(g, -4.48, 0.8, Math.PI / 2, 1.6, 1.1); porta(g, 3.4, -3.28, 0, "サーバー室");
          // as mesas em arco, viradas para quem entra; cada computador mostra a sua matéria
          const olhoT = V3(0, 0, 2.8), mesas = [[-3.2, -0.9], [-1.7, -2.5], [0, -3.0], [1.7, -2.5], [3.2, -0.9]].map(([x, z]) => [x, z, Math.atan2(olhoT.x - x, olhoT.z - z)]);
          await Promise.all(sub.subs.map(async (s, i) => { const [x, z, ry] = mesas[i]; const d = await por(g, "metal_office_desk", x, 0, z, ry, 0.85);
            const off = V3(0, 0, 0.08).applyAxisAngle(V3(0, 1, 0), ry); const pc = await por(g, "classic_laptop", x + off.x, 0.67, z + off.z, ry, 1.15);
            const [kj, cor] = KANJI[s.id] || ["技", "#7fe0ff"]; trocar(pc, /screen/, (c) => { uvPlano(c); const t = telaPC(s.name, kj, cor); c.material = new T.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new T.Color("#ffffff"), emissiveIntensity: 0.9 }); });
            const st = V3(0.6, 0, -0.65).applyAxisAngle(V3(0, 1, 0), ry); await por(g, "metal_stool_01", x + st.x, 0, z + st.z, ry, 0.9);
            alvos.push({ obj: d, nome: s.name, acao: () => M.abrir(s.id), topo: V3(x, 1.55, z) }); if (pc) alvos.push({ obj: pc, nome: s.name, acao: () => M.abrir(s.id) }); }));
          const iot = mesas[3], dI = V3(0.5, 0, 0).applyAxisAngle(V3(0, 1, 0), iot[2]);
          await Promise.all([por(g, "circuit_board", iot[0] + dI.x, 0.68, iot[1] + dI.z, 0.3, 0.9), por(g, "retro_multimeter", iot[0] - dI.x, 0.67, iot[1] - dI.z, iot[2], 1.1),
            por(g, "security_camera_01", 4.3, 2.75, -3.1, -0.8, 1.1), por(g, "power_box_01", -4.4, 1.6, 2.4, Math.PI / 2, 1),
            por(g, "steel_frame_shelves_01", -3.7, 0, -3.0, 0, 0.09), por(g, "steel_frame_shelves_01", 2.0, 0, -3.0, 0, 0.09),
            por(g, "potted_plant_04", 4.1, 0, 2.6, 0, 3)]);
          for (const x of [-2.4, 0, 2.4]) for (const z of [-1.8, 1.0]) await por(g, "mounted_fluorescent_lights", x, 3.08, z, 0, 1.2);
        } },
    };

    /* ---------- entrar, sair e trocar de vista ---------- */
    const css = document.createElement("style");
    css.textContent = `.sair{position:fixed;z-index:7;top:max(16px,env(safe-area-inset-top));left:16px;padding:9px 16px;border-radius:999px;border:1px solid rgba(246,238,226,.5);background:rgba(20,14,18,.55);color:#f6eee2;font:14px "Noto Serif JP",Georgia,serif;cursor:pointer;display:none;backdrop-filter:blur(4px)}
      body.dentro .sair{display:block}body.dentro .apr,body.dentro .cam-ui{display:none}
      .sala-ui{position:fixed;z-index:5;left:50%;bottom:18px;transform:translateX(-50%);display:none;align-items:center;gap:14px;color:#f6eee2;font:500 15px "Noto Serif JP",Georgia,serif;text-shadow:0 1px 8px rgba(0,0,0,.6);text-align:center}
      body.dentro .sala-ui{display:flex}.sala-ui small{display:block;font-size:12px;opacity:.75;letter-spacing:.04em;margin-top:3px}
      .sala-ui button{width:42px;height:42px;border-radius:50%;border:1px solid rgba(246,238,226,.45);background:rgba(20,14,18,.35);color:#f6eee2;font-size:18px;cursor:pointer;backdrop-filter:blur(4px)}
      .veu-sala{position:fixed;inset:0;z-index:9;background:#0a0810;opacity:0;pointer-events:none;transition:opacity .4s}.veu-sala.on{opacity:1}`;
    document.head.appendChild(css);
    const sair = document.createElement("button"); sair.className = "sair"; sair.type = "button"; sair.textContent = "‹ Sair da loja"; document.body.appendChild(sair);
    const ui = document.createElement("div"); ui.className = "sala-ui"; ui.innerHTML = `<button type="button" aria-label="Vista anterior">‹</button><div class="nm"></div><button type="button" aria-label="Próxima vista">›</button>`; document.body.appendChild(ui);
    const nome = ui.querySelector(".nm");
    const veu = document.createElement("div"); veu.className = "veu-sala"; document.body.appendChild(veu);
    const prontas = {};
    async function construir(id) {
      const cfg = SALAS[id], sub = M.secao(id); if (!cfg || !sub) return null;
      const scene = new T.Scene(), g = sala(cfg); scene.add(g); const alvos = [];
      scene.background = new T.Color("#0a0806");
      // luz de leve: um céu interno bem fraco, a luz da janela e luminárias quentes de apoio
      const hemi = new T.HemisphereLight("#ffe8d0", "#1a120c", 0.16); scene.add(hemi);
      const luzJanela = new T.SpotLight("#ffb070", 1.8, 12, 0.9, 0.8, 1.2);
      if (cfg.janela) { const [jx, jz, ry] = cfg.janela; const dir = V3(0, 0, 1).applyAxisAngle(V3(0, 1, 0), ry); luzJanela.position.set(jx - dir.x * 0.6, 2.4, jz - dir.z * 0.6); luzJanela.target.position.set(jx + dir.x * 3.5, 0.2, jz + dir.z * 3.5); scene.add(luzJanela, luzJanela.target); }
      for (const [x, y, z] of cfg.apoio) apoio(scene, x, y, z, cfg.tech ? 0.55 : 0.75, cfg.tech ? 6 : 4.5, cfg.corApoio || "#ffb468");
      await cfg.montar(g, sub, alvos, PAR(cfg.W, cfg.D));
      // o que tem textura com reflexo usa o céu do tema, bem fraco
      scene.environment = (M.ceu[M.tema === "noite" ? "noite" : "entardecer"] || {}).env || null;
      g.traverse((o) => { if (o.isMesh && o.material && o.material.envMapIntensity != null) o.material.envMapIntensity = 0.35; });
      const camera = new T.PerspectiveCamera(58, innerWidth / innerHeight, 0.05, 60);
      const rc = new T.Raycaster(), ptr = new T.Vector2();
      const pick = (x, y) => { ptr.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); rc.setFromCamera(ptr, camera); let melhor = null, dm = 1e9;
        for (const a of alvos) { const h = rc.intersectObject(a.obj, true)[0]; if (h && h.distance < dm) { dm = h.distance; melhor = a; } } return melhor ? { nome: melhor.nome, acao: melhor.acao } : null; };
      return { scene, camera, alvos, pick, cfg, sub, id, hemi, luzJanela, vista: 0, olho: cfg.vistas[0][0].clone(), mira: cfg.vistas[0][1].clone() };
    }
    // a janela e a luz mudam com o tema: noite é luar azulado, entardecer é sol laranja
    function luzDoTema(d) { const n = M.tema === "noite"; d.luzJanela.color.set(n ? "#8aa0e8" : "#ffb070"); d.luzJanela.intensity = n ? 0.7 : 1.8; d.hemi.intensity = n ? 0.1 : 0.16; }
    let ox = 0, oy = 0, arr = null;
    addEventListener("pointermove", (e) => { if (!M.dentro) return; if (e.pointerType === "mouse") { ox = (e.clientX / innerWidth - 0.5) * 1.1; oy = (e.clientY / innerHeight - 0.5) * 0.5; } else if (arr) { ox = Math.max(-1, Math.min(1, ox - (e.clientX - arr[0]) / innerWidth * 2)); oy = Math.max(-0.4, Math.min(0.4, oy - (e.clientY - arr[1]) / innerHeight)); arr = [e.clientX, e.clientY]; } });
    addEventListener("pointerdown", (e) => { if (M.dentro && e.pointerType !== "mouse") arr = [e.clientX, e.clientY]; });
    addEventListener("pointerup", () => { arr = null; });
    const tmp = new T.Vector3();
    M.ticks.push((t) => { const d = M.dentro; if (!d) return; const [a, b] = d.cfg.vistas[d.vista];
      d.olho.lerp(a, 0.06); d.mira.lerp(b, 0.06); d.camera.position.copy(d.olho); d.camera.position.y += Math.sin(t * 0.6) * 0.008;
      tmp.copy(d.mira).sub(d.olho).applyAxisAngle(V3(0, 1, 0), -ox * 0.8); tmp.y -= oy * tmp.length() * 0.6; d.camera.lookAt(tmp.add(d.olho)); });
    addEventListener("resize", () => { if (M.dentro) { M.dentro.camera.aspect = innerWidth / innerHeight; M.dentro.camera.updateProjectionMatrix(); } });
    const rotulo = () => { const d = M.dentro; if (!d) return; nome.innerHTML = `${esc(d.cfg.titulo)}<small>${esc(d.sub.name)} · vista ${d.vista + 1} de ${d.cfg.vistas.length} · toque nos quadros para abrir</small>`; };
    const mudarVista = (k) => { const d = M.dentro; if (!d) return; d.vista = (d.vista + k + d.cfg.vistas.length) % d.cfg.vistas.length; ox = oy = 0; rotulo(); };
    ui.children[0].onclick = () => mudarVista(-1); ui.children[2].onclick = () => mudarVista(1);
    M.vistaSala = mudarVista;

    let expFora = null;
    async function entrar(id) {
      if (!SALAS[id] || M.dentro) return;
      veu.classList.add("on"); M.fechar && M.fechar(); await new Promise((r) => setTimeout(r, 420));
      if (!prontas[id]) prontas[id] = construir(id);
      const d = await prontas[id]; if (!d) { veu.classList.remove("on"); return; }
      d.camera.aspect = innerWidth / innerHeight; d.camera.updateProjectionMatrix(); ox = oy = 0; d.vista = 0; d.olho.copy(d.cfg.vistas[0][0]); d.mira.copy(d.cfg.vistas[0][1]);
      luzDoTema(d); expFora = renderer.toneMappingExposure; renderer.toneMappingExposure = 0.85;
      M.dentro = d; document.body.classList.add("dentro"); rotulo();
      M.marcasSala && M.marcasSala(d.alvos.filter((a) => a.topo));
      setTimeout(() => veu.classList.remove("on"), 120);
    }
    async function sairDaLoja() { if (!M.dentro) return; veu.classList.add("on"); await new Promise((r) => setTimeout(r, 380)); M.fechar && M.fechar(); M.dentro = null; if (expFora != null) renderer.toneMappingExposure = expFora; document.body.classList.remove("dentro"); M.marcasSala && M.marcasSala([]); setTimeout(() => veu.classList.remove("on"), 120); }
    M.entrar = entrar; M.sair = sairDaLoja; M.temSala = (id) => !!SALAS[id];
    sair.addEventListener("click", sairDaLoja);
    addEventListener("keydown", (e) => { if (!M.dentro || (M.painelAberto && M.painelAberto())) return; if (e.key === "Escape") sairDaLoja(); else if (["ArrowRight", "ArrowDown", "PageDown"].includes(e.key)) mudarVista(1); else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) mudarVista(-1); });
  });
})();
