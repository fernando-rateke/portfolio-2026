/* Dentro das lojas. Cada loja da rua tem a sua sala: cafeteria (Quem sou), Matemática, Linguagens, Ciências
   Humanas, Ciências da Natureza e a loja maior do curso técnico, com um computador para cada matéria.
   Móveis e objetos são prontos (Poly Haven, CC0); as estruturas da sala (balcão, divisória com cortina, janela com
   o céu lá fora, porta do banheiro, vigas, tatame, painéis de papel) são montadas com texturas de verdade.
   De dia o sol entra pela porta de vidro e o resto fica na penumbra; à noite acendem as pendentes e os spots em
   cima dos quadros. Só aparecem os nomes das coisas que estão à vista. Cada sala tem dois ou três
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
      const pe = cfg.estoque && cfg.estoque.parede;
      if (pe !== "fundo") parede(W, 0, -D / 2, 0); if (pe !== "esq") parede(D, -W / 2, 0, Math.PI / 2); if (pe !== "dir") parede(D, W / 2, 0, -Math.PI / 2);
      // a parede da frente tem o vão da porta de vidro (por onde o sol entra)
      const px = cfg.portaX, pw = 1.15, ph = 2.25, ee = px - pw / 2 + W / 2, dd = W / 2 - (px + pw / 2);
      const pf = (w, h, x, y) => { const p = new T.Mesh(new T.PlaneGeometry(w, h), pm); p.position.set(x, y, D / 2); p.rotation.y = Math.PI; g.add(p); };
      pf(ee, H, -W / 2 + ee / 2, H / 2); pf(dd, H, W / 2 - dd / 2, H / 2); pf(pw, H - ph, px, ph + (H - ph) / 2);
      const teto = new T.Mesh(new T.PlaneGeometry(W, D), M.pbr("japanese_cedar_planks", [W / 2, D / 2], { metalness: 0, color: "#6a5040" })); teto.rotation.x = Math.PI / 2; teto.position.y = H; g.add(teto);
      // vigas de madeira no teto
      for (let x = -W / 2 + 1.2; x < W / 2 - 0.5; x += 1.6) box(g, 0.16, 0.2, D, ESCURA(), x, H - 0.1, 0);
      // rodapé e a faixa de madeira na altura da mão, nas quatro paredes
      for (const [w, x, z, ry, nm] of [[W, 0, -D / 2 + 0.02, 0, "fundo"], [D, -W / 2 + 0.02, 0, Math.PI / 2, "esq"], [D, W / 2 - 0.02, 0, -Math.PI / 2, "dir"], [W, 0, D / 2 - 0.02, Math.PI]])
        if (nm !== pe) for (const [y, hh] of [[0.08, 0.16], [0.92, 0.05]]) box(g, w, hh, 0.04, ESCURA(), x, y, z, ry);
      portaVidro(g, cfg);
      if (cfg.estoque) estoque(g, cfg, pm);
      return g;
    }
    // janela: moldura, vidro e o céu lá fora (do tema atual); a luz da janela entra na sala
    function janela(g, x, z, ry, w = 1.4, h = 1.05, y = 1.55) {
      const j = new T.Group(); j.position.set(x, y, z); j.rotation.y = ry; g.add(j);
      const ceu = (M.ceu[M.tema === "noite" ? "noite" : "entardecer"] || M.ceu.entardecer || {}).fundo;
      const fora = new T.MeshBasicMaterial({ color: M.tema === "noite" ? "#6a7898" : "#b8a8a0" }); if (ceu) { const t = ceu.clone(); t.needsUpdate = true; t.mapping = T.UVMapping; t.repeat.set(0.1, 0.2); t.offset.set(0.16, 0.44); fora.map = t; }
      const vidro = new T.Mesh(new T.PlaneGeometry(w, h), fora); vidro.position.z = 0.01; j.add(vidro);
      for (const [bw, bh, bx, by] of [[w + 0.16, 0.08, 0, h / 2 + 0.04], [w + 0.16, 0.1, 0, -h / 2 - 0.05], [0.08, h, -w / 2 - 0.04, 0], [0.08, h, w / 2 + 0.04, 0], [0.04, h, 0, 0], [w, 0.03, 0, 0]]) box(j, bw, bh, 0.08, ESCURA(), bx, by, 0.04);
      box(j, w + 0.3, 0.05, 0.2, ESCURA(), 0, -h / 2 - 0.12, 0.1); // peitoril
      return j;
    }
    // a porta de vidro da frente: batente de madeira, vidro com quadradinhos e a rua lá fora (céu do tema)
    function portaVidro(g, cfg) {
      const { D } = cfg, px = cfg.portaX, pw = 1.15, ph = 2.25, z = D / 2;
      for (const [w, h, x, y] of [[pw + 0.1, 0.1, px, ph], [0.08, ph, px - pw / 2, ph / 2], [0.08, ph, px + pw / 2, ph / 2], [pw, 0.06, px, 0.95], [0.05, ph, px, ph / 2], [pw, 0.05, px, 1.6]]) box(g, w, h, 0.1, ESCURA(), x, y, z - 0.02);
      const vidro = new T.Mesh(new T.PlaneGeometry(pw - 0.08, ph - 0.1), mat("vidro", () => new T.MeshStandardMaterial({ color: "#c8d8e0", transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.4, depthWrite: false })));
      vidro.position.set(px, ph / 2, z - 0.01); vidro.rotation.y = Math.PI; vidro.castShadow = false; g.add(vidro); vidro.userData.semSombra = true;
      const fora = new T.MeshBasicMaterial({ color: "#ffffff" }); const lado = new T.Mesh(new T.PlaneGeometry(4, 3.4), fora); lado.position.set(px, 1.5, z + 0.9); lado.rotation.y = Math.PI; lado.userData.semSombra = true; g.add(lado);
      g.userData.fora = fora; ceuLaFora(fora);
    }
    /* o estoque nos fundos: um cômodo atrás de uma das paredes, com passagem e cortina (noren).
       Quem entra na loja só vê os dois destaques; o resto das atividades fica guardado aqui.
       Tudo é montado num grupo "na parede": x local corre ao longo dela (u), z local negativo é o fundo do estoque. */
    function estoque(g, cfg, pm) {
      const e = cfg.estoque, { W, D, H } = cfg, vw = 1.05, vh = 2.05, Wa = e.w || 3.6, E = e.d || 2.8;
      const [wx, wz, ry, comp] = e.parede === "dir" ? [W / 2, 0, -Math.PI / 2, D] : e.parede === "esq" ? [-W / 2, 0, Math.PI / 2, D] : [0, -D / 2, 0, W];
      const grp = new T.Group(); grp.position.set(wx, 0, wz); grp.rotation.y = ry; g.add(grp);
      const u = e.u, cx = u + (e.off || 0);
      const pl = (w, h, x, y, z, r, m) => { if (w < 0.01) return; const p = new T.Mesh(new T.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.y = r; grp.add(p); return p; };
      // o lado da loja: parede com o vão, rodapé e faixa interrompidos na passagem
      const a = u - vw / 2 + comp / 2, b = comp / 2 - (u + vw / 2);
      pl(a, H, -comp / 2 + a / 2, H / 2, 0, 0, pm); pl(b, H, comp / 2 - b / 2, H / 2, 0, 0, pm); pl(vw, H - vh, u, vh + (H - vh) / 2, 0, 0, pm);
      for (const [y, hh] of [[0.08, 0.16], [0.92, 0.05]]) { box(grp, a, hh, 0.04, ESCURA(), -comp / 2 + a / 2, y, 0.02); box(grp, b, hh, 0.04, ESCURA(), comp / 2 - b / 2, y, 0.02); }
      // o batente e a cortina com o nome do cômodo
      for (const sx of [-1, 1]) box(grp, 0.08, vh, 0.18, ESCURA(), u + sx * vw / 2, vh / 2, 0); box(grp, vw + 0.16, 0.08, 0.18, ESCURA(), u, vh + 0.02, 0);
      const t = M.canvasTex(512, 800, (c, w, h) => { c.fillStyle = e.cor || "#3a3a44"; c.fillRect(0, 0, w, h); c.fillStyle = "rgba(0,0,0,.18)"; c.fillRect(0, h - 70, w, 70);
        c.fillStyle = "#f4efe4"; c.font = `700 ${Math.min(130, Math.floor(470 / e.nome.length))}px ${M.JP}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(e.nome, w / 2, 190); });
      // a cortina é comprida (quase até o chão): de dentro da loja não se vê o que está guardado
      for (let k = 0; k < 2; k++) { const geo = new T.PlaneGeometry(vw / 2 - 0.03, 1.6); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) { uv.setX(i, (k + uv.getX(i)) / 2); }
        const n = new T.Mesh(geo, new T.MeshStandardMaterial({ map: t, side: T.DoubleSide, roughness: 0.9 })); n.position.set(u - vw / 4 + k * vw / 2, vh - 0.8, 0.1); n.rotation.x = 0.03; n.userData.semSombra = true; grp.add(n); }
      // o cômodo: piso, forro, paredes de reboco simples, o verso da parede com o vão
      const escuro = e.estilo === "quarto";
      const pa = M.pbr("white_plaster_02", [Wa / 2.5, H / 2.5], { metalness: 0, color: escuro ? "#3a3c46" : "#d2c2a4" }), pp = M.pbr(escuro ? "dark_wooden_planks" : "hinoki_planks", [Wa / 2, E / 2], { metalness: 0, color: escuro ? "#4a4440" : "#c8aa88" });
      const piso = new T.Mesh(new T.PlaneGeometry(Wa, E), pp); piso.rotation.x = -Math.PI / 2; piso.position.set(cx, 0.001, -E / 2); grp.add(piso);
      const teto = new T.Mesh(new T.PlaneGeometry(Wa, E), pa); teto.rotation.x = Math.PI / 2; teto.position.set(cx, H, -E / 2); grp.add(teto);
      pl(Wa, H, cx, H / 2, -E, 0, pa); pl(E, H, cx - Wa / 2, H / 2, -E / 2, Math.PI / 2, pa); pl(E, H, cx + Wa / 2, H / 2, -E / 2, -Math.PI / 2, pa);
      const a2 = (u - vw / 2) - (cx - Wa / 2), b2 = (cx + Wa / 2) - (u + vw / 2);
      pl(a2, H, cx - Wa / 2 + a2 / 2, H / 2, -0.01, Math.PI, pa); pl(b2, H, cx + Wa / 2 - b2 / 2, H / 2, -0.01, Math.PI, pa); pl(vw, H - vh, u, vh + (H - vh) / 2, -0.01, Math.PI, pa);
      box(grp, Wa, 0.14, 0.03, ESCURA(), cx, 0.07, -E + 0.015);
      // posições no estoque em coordenadas da sala: [x, y, z, ry]
      grp.updateMatrixWorld(true);
      const W2 = (x, y, z, r = 0) => { const p = grp.localToWorld(V3(x, y, z)); return [p.x, p.y, p.z, ry + r]; };
      g.userData.est = { grp, W2, cx, E, Wa, u, ry };
    }
    function ceuLaFora(fora) { const ceu = (M.ceu[M.tema === "noite" ? "noite" : "entardecer"] || M.ceu.entardecer || {}).fundo; if (!ceu) return; const t = ceu.clone(); t.needsUpdate = true; t.mapping = T.UVMapping; t.repeat.set(0.18, 0.42); t.offset.set(0.12, 0.3); fora.map = t; fora.color.set(M.tema === "noite" ? "#8090b0" : "#ffffff"); fora.needsUpdate = true; }
    // luminária pendente de verdade (modelo pronto) com uma luz quente e curta logo abaixo
    async function pendente(cena, g, x, z, H, lista, modeloL = "hanging_industrial_lamp", esc = 0.5, forcar = false) {
      // só as duas primeiras pendentes de cada sala acendem uma luz de verdade (as outras brilham, mas não iluminam): luz custa caro
      const comLuz = forcar || (lista.np = (lista.np || 0) + 1) <= 2;
      const o = await por(g, modeloL, x, H, z, 0, esc);
      if (o) o.traverse((c) => { if (c.isMesh) { c.userData.semSombra = true; if (/glass/i.test(c.material.name || "")) { c.material.emissive = new T.Color("#ffd49a"); c.material.emissiveIntensity = 1.5; lista.vidros.push(c.material); } } });
      if (!comLuz) return; const yb = o ? new T.Box3().setFromObject(o).min.y : H - 0.9; const l = new T.PointLight("#ffb766", 0.5, 4.6, 2); l.position.set(x, yb - 0.12, z); cena.add(l); lista.luzes.push(l);
    }
    // divisória vazada: meia-parede de madeira e, em cima, um painel de quadrados com vidro âmbar (como blocos de vidro)
    const grade = M.canvasTex(512, 512, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = "rgba(255,206,140,0.38)"; c.fillRect(0, 0, w, h); c.fillStyle = "#4a3426"; const n = 6, b = 10; for (let i = 0; i <= n; i++) { c.fillRect(i * (w - b) / n, 0, b, h); c.fillRect(0, i * (h - b) / n, w, b); } });
    function divisoriaVazada(g, x, z, comp, ry, alt = 2.35) {
      const d = new T.Group(); d.position.set(x, 0, z); d.rotation.y = ry; g.add(d);
      box(d, comp, 1.0, 0.16, MADEIRA(), 0, 0.5, 0); box(d, comp + 0.04, 0.05, 0.22, ESCURA(), 0, 1.02, 0);
      const pn = new T.Mesh(new T.PlaneGeometry(comp, alt - 1.05), mat("grade", () => new T.MeshStandardMaterial({ map: grade, transparent: true, side: T.DoubleSide, roughness: 0.3, emissive: new T.Color("#ffd8a0"), emissiveMap: grade, emissiveIntensity: 0.12, depthWrite: false })));
      pn.position.y = 1.05 + (alt - 1.05) / 2; d.add(pn);
      // a sombra do sol passa pelos quadradinhos de vidro e desenha a grade no chão
      pn.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: grade, alphaTest: 0.6, side: T.DoubleSide });
      for (const sx of [-1, 1]) box(d, 0.08, alt - 1.05, 0.12, ESCURA(), sx * comp / 2, 1.05 + (alt - 1.05) / 2, 0);
      box(d, comp + 0.08, 0.08, 0.12, ESCURA(), 0, alt, 0);
      return d;
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
      const pronto = (tex) => { tex.encoding = T.sRGBEncoding; tex.anisotropy = 4; mesh.material = new T.MeshStandardMaterial({ map: tex, roughness: 0.65, emissive: new T.Color("#ffffff"), emissiveMap: tex, emissiveIntensity: 0.1 }); };
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
    // a tela do computador com uma atividade: barra com a cor da matéria e o título, a imagem inteira embaixo
    function telaAtividade(mesh, a, kj, cor) {
      uvPlano(mesh); const desenha = (img) => M.canvasTex(512, 384, (c, w, h) => { c.fillStyle = "#0e1420"; c.fillRect(0, 0, w, h); c.fillStyle = cor; c.fillRect(0, 0, w, 40);
        c.fillStyle = "#0e1420"; c.font = "600 19px monospace"; let t = a.t; while (c.measureText(t).width > w - 24 && t.length > 4) t = t.slice(0, -2); c.fillText(t === a.t ? t : t + "…", 12, 27);
        if (img) { const m = 14, s = Math.min((w - 2 * m) / img.width, (h - 40 - 2 * m) / img.height), iw = img.width * s, ih = img.height * s; c.drawImage(img, (w - iw) / 2, 40 + (h - 40 - ih) / 2, iw, ih); }
        else { c.font = `700 110px ${M.JPS}`; c.fillStyle = cor; c.textAlign = "center"; c.fillText(kj, w / 2, 230); } });
      const pronto = (t) => { mesh.material = new T.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new T.Color("#ffffff"), emissiveIntensity: 0.9 }); };
      pronto(desenha(null)); if (!a.img) return;
      const img = new Image(); img.crossOrigin = "anonymous"; img.onload = () => { try { pronto(desenha(img)); } catch (e) { /* fica a tela com o kanji */ } }; img.src = imgUrl(a.img);
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
    // quando a matéria tem destaques, as vagas da loja recebem só os dois destaques (o resto vai para o estoque, ver guardar)
    async function quadros(g, id, sub, alvos, vagas, modeloQ = "hanging_picture_frame_02", esc0 = 1.5) {
      const temDest = sub.acts.some((a) => a.dest);
      await Promise.all(sub.acts.map(async (a, i) => { if (temDest && !a.dest) return; const v = vagas[i % vagas.length]; if (!v) return; const [x, y, z, ry, s, mq, incl] = v; const q = await por(g, mq || modeloQ, x, y, z, ry, s || esc0); if (!q) return;
        if (incl) { q.rotation.order = "YXZ"; q.rotation.x = -incl; }
        trocar(q, /artwork|canvas/, (c) => imagemNoQuadro(c, a.img, a.t, a.r)); trocar(q, /glass/, (c) => { c.visible = false; });
        q.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(q);
        const c = bb.getCenter(V3()), nrm = V3(0, 0, 1).applyAxisAngle(V3(0, 1, 0), ry);
        if (a.dest) plaquinha(g, V3(c.x, bb.min.y - 0.1, c.z).addScaledVector(nrm, 0.02), ry);
        const alto = a.dest && sub.acts.slice(0, i).some((b) => b.dest) ? 0.5 : 0; // o segundo destaque tem o nome um pouco mais alto, para os dois não se taparem
        alvos.push({ obj: q, nome: a.t, acao: () => M.abrirAtividade(id, i), topo: V3(c.x, bb.max.y + 0.1 + alto, c.z), ver: c.clone(), foco: [c.clone().addScaledVector(nrm, 0.75).setY(9), c], perto: [c.clone().addScaledVector(nrm, 1.45), c.clone()] }); }));
    }
    // a plaquinha de "recomendado" que as lojas japonesas penduram nos produtos em destaque
    const popTex = M.canvasTex(320, 128, (c, w, h) => { c.fillStyle = "#b5301b"; c.fillRect(0, 0, w, h); c.strokeStyle = "#f4e2c4"; c.lineWidth = 4; c.strokeRect(8, 8, w - 16, h - 16);
      c.fillStyle = "#fff4e0"; c.textAlign = "center"; c.textBaseline = "middle"; c.font = `700 52px ${M.JP}`; c.fillText("おすすめ", w / 2, 52); c.font = `500 22px ${M.JPS}`; c.fillText("DESTAQUE", w / 2, 98); });
    function plaquinha(g, p, ry, e = 1) { const m = new T.Mesh(new T.PlaneGeometry(0.34 * e, 0.136 * e), mat("pop", () => new T.MeshStandardMaterial({ map: popTex, emissiveMap: popTex, emissive: new T.Color("#ffffff"), emissiveIntensity: 0.12, roughness: 0.7 })));
      m.position.copy(p); m.rotation.y = ry; m.rotation.z = 0.04; m.userData.semSombra = true; g.add(m); }
    // destaques e o resto: [atividade, ação, matéria]; no técnico, juntando as matérias do curso (sem repetir título)
    const itensDe = (sub, dest) => { const vistos = new Set(); return (sub.subs || [sub]).flatMap((s) => s.acts.map((a, i) => [a, () => M.abrirAtividade(s.id, i), s]))
      .filter(([a]) => (dest ? a.dest === true : a.dest === false) && !vistos.has(a.t) && vistos.add(a.t)); };
    const restoDe = (sub) => itensDe(sub, false), destaquesDe = (sub) => itensDe(sub, true).slice(0, 2);
    /* os dois destaques ficam na frente, logo na entrada: cada um num cavalete de madeira virado para quem entra,
       com o spot do teto em cima e a plaquinha おすすめ no apoio */
    function cavalete(g) { const c = new T.Group(), m = ESCURA(), mc = MADEIRA();
      for (const sx of [-1, 1]) { const l = box(c, 0.05, 1.95, 0.05, m, sx * 0.3, 0.95, 0.04); l.rotation.z = sx * 0.09; l.rotation.x = -0.07; }
      const tr = box(c, 0.05, 1.9, 0.05, m, 0, 0.9, -0.32); tr.rotation.x = 0.32;
      box(c, 0.92, 0.05, 0.14, mc, 0, 0.78, 0.09); box(c, 0.92, 0.03, 0.03, m, 0, 0.82, 0.155); box(c, 0.5, 0.05, 0.05, m, 0, 1.78, -0.02);
      g.add(c); return c; }
    async function cavaletes(g, cfg, itens, alvos) {
      const { D } = cfg, px = cfg.portaX, porta = V3(px, 0, D / 2 + 0.8);
      const pos = cfg.cav || [[px - 1.2, D / 2 - 1.95], [px + 1.2, D / 2 - 1.95]];
      await Promise.all(itens.slice(0, 2).map(async ([a, acao], k) => { const [x, z] = pos[k], ry = Math.atan2(porta.x - x, porta.z - z);
        const c = cavalete(g); c.position.set(x, 0, z); c.rotation.y = ry;
        const q = await por(c, "hanging_picture_frame_02", 0, 1.2, 0.11, 0, 1.45); if (!q) return; q.rotation.x = -0.1;
        trocar(q, /artwork|canvas/, (m) => imagemNoQuadro(m, a.img, a.t, a.r)); trocar(q, /glass/, (m) => { m.visible = false; });
        const pl = new T.Group(); pl.position.set(0, 0.69, 0.17); c.add(pl); plaquinha(pl, V3(), 0, 0.9);
        c.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(q), ctr = bb.getCenter(V3()), nrm = V3(0, 0, 1).applyAxisAngle(V3(0, 1, 0), ry);
        alvos.push({ obj: q, nome: a.t, acao, topo: V3(ctr.x, bb.max.y + 0.12 + k * 0.42, ctr.z), ver: ctr.clone(), foco: [ctr.clone().addScaledVector(nrm, 0.9).setY(9), ctr.clone()], perto: [ctr.clone().addScaledVector(nrm, 1.55), ctr.clone()] }); }));
    }
    /* o estoque, nos fundos: um arquivo arrumado. Uma estante de madeira cobre a parede do fundo e cada atividade guardada
       fica de pé numa prateleira, encostada, com uma etiqueta de papel kraft pendurada com o nome; caixas de arquivo
       na prateleira de baixo, um gaveteiro e uma escada de um lado, caixas empilhadas do outro, duas lâmpadas nuas. */
    const etiqueta = (txt) => M.canvasTex(320, 120, (c, w, h) => { c.fillStyle = "#c9a878"; c.fillRect(0, 0, w, h); c.fillStyle = "rgba(90,60,30,.18)"; for (let i = 0; i < 400; i++) c.fillRect(Math.random() * w, Math.random() * h, 2, 1);
      c.fillStyle = "#f2e6d0"; c.beginPath(); c.arc(22, h / 2, 7, 0, 7); c.fill(); c.strokeStyle = "#7a5a3a"; c.lineWidth = 2; c.stroke();
      c.fillStyle = "#2a1c12"; c.font = `600 25px ${M.JP}`; c.textBaseline = "middle"; const pal = String(txt).split(/\s+/); const ls = [""]; for (const p of pal) { const t = (ls[ls.length - 1] + " " + p).trim(); if (c.measureText(t).width > w - 60 && ls[ls.length - 1]) ls.push(p); else ls[ls.length - 1] = t; }
      const vis = ls.slice(0, 2); if (ls.length > 2) vis[1] = vis[1].replace(/.{0,2}$/, "…"); vis.forEach((l, k) => c.fillText(l, 42, h / 2 + (k - (vis.length - 1) / 2) * 30)); });
    async function guardar(g, id, resto, alvos, L) {
      const est = g.userData.est; if (!est) return; const cfg = SALAS[id], { W2, cx, E, Wa } = est;
      if (cfg.estoque.estilo === "quarto") return quarto(g, id, resto, alvos, L);
      // a estante (em coordenadas do estoque: x ao longo da parede do fundo, z para dentro)
      const sw = Wa - 0.5, fz = -E + 0.24, est3 = new T.Group(); { const [x, y, z, r] = W2(cx, 0, fz); est3.position.set(x, y, z); est3.rotation.y = r; g.add(est3); }
      const MD = MADEIRA(), ES = ESCURA();
      for (const y of [0.06, 0.92, 1.8]) box(est3, sw, 0.05, 0.44, MD, 0, y, 0); box(est3, sw + 0.06, 0.06, 0.48, ES, 0, 2.5, 0);
      for (const x of [-sw / 2, -sw / 6, sw / 6, sw / 2]) box(est3, 0.06, 2.5, 0.44, ES, x, 1.25, 0);
      box(est3, sw, 2.5, 0.02, M.pbr("hinoki_planks", [2, 1.5], { metalness: 0, color: "#a88a68" }), 0, 1.25, -0.21);
      // caixas de arquivo na prateleira de baixo
      const caixaArq = (x) => box(est3, 0.3, 0.32, 0.36, mat("arq", () => new T.MeshStandardMaterial({ color: "#8a6a48", roughness: 0.85 })), x, 0.25, 0.02);
      for (const x of [-1.25, -0.92, -0.2, 0.12, 0.85, 1.18]) caixaArq(x);
      // as vagas: três por prateleira, de baixo para cima
      const cols = [0, -sw / 3, sw / 3], vagas = [...cols.map((x) => [x, 1.83]), ...cols.map((x) => [x, 0.95])];
      // as vagas que sobram ficam com livros e caixas (a estante não fica vazia)
      await Promise.all(vagas.slice(resto.length).map(([x, y], k) => (k % 2 ? por(est3, "cardboard_box_01", x + 0.1, y + 0.03, 0, 0.3, 0.75) : por(est3, "book_encyclopedia_set_01", x, y + 0.03, 0.02, 0, 0.95))));
      await Promise.all(resto.map(async ([a, acao], k) => { const [x, y] = vagas[k % vagas.length];
        const q = await por(est3, "hanging_picture_frame_02", x, y + 0.3, 0.02, 0, 1.08); if (!q) return; q.rotation.order = "YXZ"; q.rotation.x = -0.11;
        trocar(q, /artwork|canvas/, (m) => imagemNoQuadro(m, a.img, a.t, a.r)); trocar(q, /glass/, (m) => { m.visible = false; });
        // a etiqueta pendurada na beirada da prateleira
        const tg = new T.Mesh(new T.PlaneGeometry(0.36, 0.135), new T.MeshStandardMaterial({ map: etiqueta(a.t), roughness: 0.9, side: T.DoubleSide })); tg.position.set(x + 0.16, y - 0.07, 0.235); tg.rotation.z = (k % 2 ? 1 : -1) * 0.05; tg.userData.semSombra = true; est3.add(tg);
        est3.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(q), c = bb.getCenter(V3()), nrm = V3(0, 0, 1).applyAxisAngle(V3(0, 1, 0), est3.rotation.y);
        alvos.push({ obj: q, nome: a.t, acao, topo: V3(c.x, bb.max.y + 0.08, c.z), ver: c.clone(), perto: [c.clone().addScaledVector(nrm, 1.25), c.clone()] }); }));
      // de um lado o gaveteiro e a escada; do outro, caixas empilhadas
      await Promise.all([por(g, "drawer_cabinet", ...W2(cx - Wa / 2 + 0.28, 0, -1.2, Math.PI / 2), 0.85), por(g, "ladder_sectioned_01", ...W2(cx - Wa / 2 + 0.2, 0, -0.45, Math.PI / 2 + 0.1), 0.95),
        por(g, "cardboard_box_01", ...W2(cx + Wa / 2 - 0.3, 0, -0.7, 0.1)), por(g, "cardboard_box_01", ...W2(cx + Wa / 2 - 0.3, 0.34, -0.72, -0.1)), por(g, "cardboard_box_01", ...W2(cx + Wa / 2 - 0.32, 0.68, -0.7, 0.2), 0.9),
        por(g, "cardboard_box_01", ...W2(cx + Wa / 2 - 0.3, 0, -1.3, -0.15))]);
      // duas lâmpadas nuas penduradas por um fio, com luz quente de verdade só numa (a outra só brilha)
      for (const [k, x] of [[0, cx - 0.8], [1, cx + 0.8]]) { const [lx, , lz] = W2(x, 0, -E / 2 - 0.1); const fio = box(g, 0.01, 0.6, 0.01, ES, lx, cfg.H - 0.3, lz); fio.userData.semSombra = true;
        const b = await por(g, "lightbulb_01", lx, cfg.H - 0.66, lz, 0, 1.6); if (b) { b.rotation.x = Math.PI; b.traverse((o) => { if (o.isMesh) { o.userData.semSombra = true; if (/glass/.test(o.material.name || "")) { o.material.emissive = new T.Color("#ffc070"); o.material.emissiveIntensity = 2.2; L.vidros.push(o.material); } } }); }
        if (k === 0) { const l = new T.PointLight("#ffbe78", 0.8, 6, 1.6); const [mx, , mz] = W2(cx, 0, -E / 2); l.position.set(mx, cfg.H - 0.75, mz); L.cena.add(l); l.userData.k = 1.4; L.focos.push(l); } }
      if (!cfg.vistas.some((v) => v[2])) { const o = W2(cx, 1.62, -0.12), m = W2(cx, 1.42, -E); cfg.vistas.push([V3(o[0], o[1], o[2]), V3(m[0], m[1], m[2]), true]); }
    }
    /* o quarto do técnico: escuro, só a luz das telas. Monitores de tubo antigos empilhados pelas paredes e pelo chão,
       fios espalhados para todo lado e caindo do teto; cada atividade guardada brilha na tela de um dos monitores. */
    const ruido = () => M.canvasTex(256, 192, (c, w, h) => { c.fillStyle = "#081018"; c.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const v = Math.random() * 90 | 0; c.fillStyle = `rgb(${v * 0.6},${v * 0.8},${v})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 1); }
      for (let y = 0; y < h; y += 3) { c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(0, y, w, 1); } });
    const terminal = (linhas, cor) => M.canvasTex(256, 192, (c, w, h) => { c.fillStyle = "#040a0c"; c.fillRect(0, 0, w, h); c.font = "15px monospace"; linhas.forEach((l, i) => { c.fillStyle = cor; c.fillText(l, 12, 26 + i * 19); });
      for (let y = 0; y < h; y += 3) { c.fillStyle = "rgba(0,0,0,.3)"; c.fillRect(0, y, w, 1); } });
    function telaCRT(mesh, a) { const desenha = (img) => M.canvasTex(320, 240, (c, w, h) => { c.fillStyle = "#06090e"; c.fillRect(0, 0, w, h);
        if (img) { const s = Math.min((w - 20) / img.width, (h - 44) / img.height), iw = img.width * s, ih = img.height * s; c.globalAlpha = 0.92; c.drawImage(img, (w - iw) / 2, 10 + (h - 44 - ih) / 2, iw, ih); c.globalAlpha = 1; }
        c.fillStyle = "#9fe8ff"; c.font = "600 15px monospace"; let t = a.t; while (c.measureText(t).width > w - 20 && t.length > 4) t = t.slice(0, -2); c.fillText(t === a.t ? t : t + "…", 10, h - 12);
        if (!img) { c.fillStyle = "#bff2ff"; c.font = "700 22px monospace"; const ps = a.t.split(/\s+/), ls = [""]; for (const p of ps) { const tt = (ls[ls.length - 1] + " " + p).trim(); if (c.measureText(tt).width > w - 30 && ls[ls.length - 1]) ls.push(p); else ls[ls.length - 1] = tt; }
          ls.slice(0, 4).forEach((l, i) => c.fillText(l, 15, 50 + i * 30)); c.fillStyle = "#7fe0a8"; c.font = "14px monospace"; c.fillText("> abrir_", 15, h - 40); }
        for (let y = 0; y < h; y += 3) { c.fillStyle = "rgba(0,0,0,.28)"; c.fillRect(0, y, w, 1); } const gr = c.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.55)"); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
      const pronto = (t) => { mesh.material = new T.MeshBasicMaterial({ map: t, toneMapped: false, color: new T.Color(0.85, 0.92, 1) }); };
      pronto(desenha(null)); if (!a.img) return; const img = new Image(); img.crossOrigin = "anonymous"; img.onload = () => { try { pronto(desenha(img)); } catch (e) { /* fica sem a foto */ } }; img.src = imgUrl(a.img); }
    async function quarto(g, id, resto, alvos, L) {
      const cfg = SALAS[id], { W2, cx, E, Wa } = g.userData.est, H = cfg.H, R = () => Math.random();
      // a tela de vidro de cada monitor é um plano em cima da frente do modelo
      const crt = async (lx, ly, lz, lr, tela) => { const [x, y, z, r] = W2(lx, ly, lz, lr); const tv = await por(g, "Television_01", x, y, z, r, 1.0); if (!tv) return null;
        const sc = new T.Mesh(new T.PlaneGeometry(0.4, 0.3), tela); sc.position.set(-0.04, 0.245, 0.215); sc.userData.semSombra = true; tv.add(sc); return { tv, sc }; };
      const fundo = [], tex = [ruido(), terminal(["> ping 192.168.0.12", "  resposta 12ms", "> ls /arquivos", "  modelagem iot", "  banco web", "> _"], "#7fe0a8"), terminal(["接続中...", "", "  ░░░░░░░░ 42%", "", "  aguardando"], "#9fc8ff"), ruido()];
      const telaFundo = (k) => new T.MeshBasicMaterial({ map: tex[k % tex.length], toneMapped: false, color: new T.Color(0.55, 0.7, 0.85) });
      // pilhas de monitores: no fundo, três colunas de dois ou três; nas laterais, mais pilhas tortas; alguns no chão
      const pilhas = [[cx - 1.1, -E + 0.32, 0, 3], [cx - 0.38, -E + 0.3, 0, 2], [cx + 0.36, -E + 0.3, 0, 3], [cx + 1.12, -E + 0.32, 0, 2],
        [cx - Wa / 2 + 0.34, -1.5, Math.PI / 2, 2], [cx - Wa / 2 + 0.34, -0.8, Math.PI / 2 - 0.2, 1], [cx + Wa / 2 - 0.34, -1.6, -Math.PI / 2, 3], [cx + Wa / 2 - 0.36, -0.85, -Math.PI / 2 + 0.25, 1]];
      const lugares = []; for (const [x, z, r, n] of pilhas) for (let k = 0; k < n; k++) lugares.push([x + (R() - 0.5) * 0.06, k * 0.465, z + (R() - 0.5) * 0.05, r + (R() - 0.5) * 0.18]);
      // as atividades vão nos monitores mais à vista (na altura do olho, no fundo)
      const ordem = lugares.map((l, i) => i).sort((a, b) => Math.abs(lugares[a][1] - 0.93) + Math.abs(lugares[a][2] + E) * 0.4 - (Math.abs(lugares[b][1] - 0.93) + Math.abs(lugares[b][2] + E) * 0.4));
      const comAtiv = new Map(ordem.slice(0, resto.length).map((li, k) => [li, resto[k]]));
      await Promise.all(lugares.map(async ([x, y, z, r], i) => { const it = comAtiv.get(i); const m = it ? new T.MeshBasicMaterial({ color: "#123" }) : telaFundo(i);
        const o = await crt(x, y, z, r, m); if (!o) return; if (it) { telaCRT(o.sc, it[0]); o.tv.updateMatrixWorld(true); const c = new T.Vector3(); o.sc.getWorldPosition(c);
          const nrm = V3(0, 0, 1).applyAxisAngle(V3(0, 1, 0), o.tv.rotation.y); alvos.push({ obj: o.tv, nome: it[0].t, acao: it[1], topo: c.clone().add(V3(0, 0.3, 0)), ver: c.clone(), perto: [c.clone().addScaledVector(nrm, 1.0).setY(c.y + 0.1), c.clone()] }); }
        else fundo.push(o); }));
      // as telas de fundo piscam devagar, cada uma no seu ritmo
      M.ticks.push((t) => { if (!M.dentro || M.dentro.id !== id) return; fundo.forEach((o, k) => { const v = 0.5 + 0.18 * Math.sin(t * (0.7 + (k % 5) * 0.31) + k); o.sc.material.color.setRGB(v * 0.75, v * 0.95, v * 1.15); }); });
      // os fios: no chão, serpenteando entre as pilhas, e alguns caindo do teto em curva
      const fioM = new T.MeshStandardMaterial({ color: "#0b0c0f", roughness: 0.75, envMapIntensity: 0.05 }), fioM2 = new T.MeshStandardMaterial({ color: "#1e160f", roughness: 0.8, envMapIntensity: 0.05 });
      const fio = (pts, r, m) => { const c = new T.CatmullRomCurve3(pts.map((p) => V3(...W2(p[0], p[1], p[2]).slice(0, 3)))); const tb = new T.Mesh(new T.TubeGeometry(c, Math.max(16, pts.length * 10), r, 5), m); tb.userData.semSombra = true; g.add(tb); };
      // (deitados no chão: saem da base de uma pilha, descem e serpenteiam de lado, cruzando uns com os outros)
      for (let k = 0; k < 30; k++) { const [px, , pz] = pilhas[k % pilhas.length], x0 = px + (R() - 0.5) * 0.3, z0 = pz + 0.2 + R() * 0.1, n = 5 + (R() * 4 | 0); const pts = [[x0, 0.12 + R() * 0.25, z0], [x0 + (R() - 0.5) * 0.1, 0.012, z0 + 0.12]];
        let x = x0, z = z0 + 0.12; for (let j = 0; j < n; j++) { x = Math.max(cx - Wa / 2 + 0.12, Math.min(cx + Wa / 2 - 0.12, x + (R() - 0.5) * 1.1)); z = Math.max(-E + 0.3, Math.min(-0.25, z + (R() - 0.35) * 0.4)); pts.push([x, 0.012, z]); }
        fio(pts, 0.008 + R() * 0.007, k % 4 ? fioM : fioM2); }
      for (let k = 0; k < 7; k++) { const x0 = cx + (R() - 0.5) * (Wa - 0.8), z0 = -0.5 - R() * (E - 0.9), x1 = x0 + (R() - 0.5) * 1.4, z1 = z0 + (R() - 0.5) * 0.8;
        fio([[x0, H - 0.01, z0], [(x0 + x1) / 2, H - 0.6 - R() * 0.8, (z0 + z1) / 2], [x1, H - 0.01, z1]], 0.007, fioM); }
      // um teclado velho e o gabinete no chão, e a luz azulada das telas
      await por(g, "classic_laptop", ...W2(cx + 0.2, 0, -1.1, 0.5), 1.0);
      for (const [x, z, cor, k] of [[cx, -E + 0.9, "#5a8cff", 1.6], [cx + 1.0, -1.2, "#7affd0", 0.9]]) { const l = new T.PointLight(cor, 0.8, 5, 1.6); const [lx, , lz] = W2(x, 0, z); l.position.set(lx, 1.2, lz); L.cena.add(l); l.userData.k = k; L.focos.push(l); }
      if (!cfg.vistas.some((v) => v[2])) { const o = W2(cx - 0.1, 1.5, -0.1), m = W2(cx, 0.95, -E); cfg.vistas.push([V3(o[0], o[1], o[2]), V3(m[0], m[1], m[2]), true]); }
    }
    // um bilhete de agradecimento emoldurado (abre o agradecimento completo, que fica no santuário)
    async function bilhete(g, alvos, v, titulo, corpo, acao, nomeMarca) { const [x, y, z, ry] = v; const q = await por(g, "hanging_picture_frame_01", x, y, z, ry, 1.05); if (!q) return;
      trocar(q, /artwork|canvas/, (c) => imagemNoQuadro(c, "", titulo, corpo)); trocar(q, /glass/, (c) => { c.visible = false; });
      q.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(q), c = bb.getCenter(V3()), nrm = V3(0, 0, 1).applyAxisAngle(V3(0, 1, 0), ry);
      alvos.push({ obj: q, nome: nomeMarca, acao, topo: V3(c.x, bb.max.y + 0.1, c.z), ver: c.clone() }); }
    // ventilador de teto girando devagar
    const girando = [];
    async function ventilador(g, x, z, H) { const v = await por(g, "ceiling_fan", x, H, z, 0, 1); if (v) { v.traverse((c) => { if (c.isMesh) c.userData.semSombra = true; }); girando.push(v); } }

    /* ---------- as salas ---------- */
    const SALAS = {
      perfil: { titulo: "A cafeteria", W: 6.4, D: 5.6, H: 2.9, piso: "wood_floor", corPiso: "#c8b0a0", parede: "beige_wall_001", corParede: "#d8c0a4",
        vistas: [[V3(1.1, 1.6, 2.3), V3(-0.7, 1.3, -2.8)], [V3(-2.4, 1.5, 1.8), V3(2.2, 1.1, -1.2)], [V3(0.6, 1.55, -1.5), V3(0.3, 1.0, 2.8)]],
        portaX: 0.4, semCavalete: true,
        async montar(g, sub, alvos, P, L) {
          // a divisória vazada separa as mesas do corredor do balcão; pendentes sobre o balcão e o ventilador no teto
          divisoriaVazada(g, -0.3, -1.2, 1.9, Math.PI / 2);
          await Promise.all([L.pend(-1.9, -1.0), L.pend(1.9, -1.4), L.pend(1.9, -0.5), ventilador(g, -1.5, 1.2, 2.9)]);
          balcao(g, 1.9, -0.9, 2.6, Math.PI / 2, 1.0); janela(g, -3.18, -0.4, Math.PI / 2);
          await Promise.all([por(g, "CoffeeCart_01", 2.85, 0, 0.9, -Math.PI / 2, 0.75), por(g, "CashRegister_01", 1.95, 1.0, -1.7, -Math.PI / 2, 0.75), por(g, "vintage_electric_kettle", 1.9, 1.0, -0.3, -1.2, 1),
            por(g, "bar_chair_round_01", 1.25, 0, -1.9, 1.2, 1), por(g, "bar_chair_round_01", 1.25, 0, -1.0, 1.8, 1),
            por(g, "round_wooden_table_01", -1.9, 0, -1.0, 0, 0.72), por(g, "tea_set_01", -1.9, 0.72, -1.0, 0.6, 0.85), por(g, "chinese_armchair", -2.5, 0, -0.1, 2.4, 0.9), por(g, "chinese_armchair", -1.1, 0, -1.8, -0.6, 0.9),
            por(g, "potted_plant_04", -2.95, 1.05, -0.4, 0, 1.6), por(g, "ceramic_vase_01", -2.9, 0, 2.4, 0, 2)]);
          /* o que se toca aqui: a folha do currículo, sobre o balcão (só ao tocar o currículo aparece), e o caderno do
             "Sobre mim", na mesa (só ao abrir aparece a foto, ao lado do texto) */
          const folhaTex = M.canvasTex(420, 594, (c, w, h) => { c.fillStyle = "#f6f1e6"; c.fillRect(0, 0, w, h); c.fillStyle = "#2a2220"; c.font = `700 46px ${M.JP}`; c.fillText("履歴書", 34, 78);
            c.font = `600 24px ${M.JP}`; c.fillText("Currículo", 36, 116); c.fillStyle = "#b5301b"; c.fillRect(36, 132, 90, 3); c.fillStyle = "rgba(60,45,35,.28)";
            for (let y = 176; y < h - 40; y += 26) c.fillRect(36, y, (y * 37) % 5 === 0 ? 220 : w - 72, 5); });
          const folha = new T.Mesh(new T.PlaneGeometry(0.3, 0.42), new T.MeshStandardMaterial({ map: folhaTex, roughness: 0.9 })); folha.rotation.x = -Math.PI / 2; folha.rotation.z = 0.28;
          folha.position.set(1.85, 1.012, -0.95); g.add(folha);
          alvos.push({ obj: folha, nome: "Currículo", acao: () => M.abrirCurriculo && M.abrirCurriculo(), topo: V3(1.85, 1.45, -0.95), ver: V3(1.85, 1.05, -0.95), foco: [V3(1.85, 9, -0.6), V3(1.85, 1.0, -0.95)] });
          const cad = await por(g, "binder_notebook", -1.6, 0.72, -0.72, 0.5, 1.25);
          if (cad) alvos.push({ obj: cad, nome: "Sobre mim", acao: () => M.abrirAtividade("perfil", 0), topo: V3(-1.6, 1.2, -0.72), ver: V3(-1.6, 0.8, -0.72), foco: [V3(-1.6, 9, -0.4), V3(-1.6, 0.75, -0.72)] });
        } },
    };

    /* ---------- entrar, sair e trocar de vista ---------- */
    const css = document.createElement("style");
    css.textContent = `.sair{position:fixed;z-index:7;top:max(16px,env(safe-area-inset-top));left:16px;padding:9px 16px;border-radius:999px;border:1px solid rgba(246,238,226,.5);background:rgba(20,14,18,.55);color:#f6eee2;font:14px "Noto Serif JP",Georgia,serif;cursor:pointer;display:none;backdrop-filter:blur(4px)}
      body.dentro .sair{display:block}body.dentro .apr,body.dentro .cam-ui,body.dentro .nav-lugar,body.dentro .nav-mapa{display:none}
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
      /* a luz: quase nada de ambiente. De dia, o sol entra pela porta de vidro e desenha um retângulo quente no chão
         (com a sombra do batente e da divisória); o resto fica na penumbra, com as pendentes fracas.
         À noite o sol some e quem ilumina são as pendentes e os spots em cima de cada quadro. */
      const hemi = new T.HemisphereLight("#ffe8d0", "#1a120c", 0.05); scene.add(hemi);
      const { D, portaX: px } = cfg;
      const sol = new T.SpotLight("#ffb070", 6, 14, 0.42, 0.35, 1.2); sol.position.set(px + 2.2, 3.4, D / 2 + 3.2); sol.target.position.set(px - 1.0, 0, D / 2 - 2.6); scene.add(sol, sol.target);
      { sol.castShadow = true; sol.shadow.mapSize.set(1024, 1024); sol.shadow.camera.near = 1; sol.shadow.camera.far = 14; sol.shadow.bias = -0.0006; sol.shadow.radius = 3; }
      const facho = feixe(cfg, sol); scene.add(facho);
      const L = { cena: scene, vidros: [], luzes: [], focos: [] };
      L.pend = (x, z, m, e, f) => pendente(scene, g, x, z, cfg.H, L, m, e, f);
      await cfg.montar(g, sub, alvos, PAR(cfg.W, cfg.D), L);
      // os destaques na entrada (o técnico monta os dele) e a primeira vista: da porta, olhando os dois
      if (!cfg.semCavalete) await cavaletes(g, cfg, destaquesDe(sub), alvos);
      if (!cfg.v0) { cfg.vistas[0] = [V3(cfg.portaX, 1.66, cfg.D / 2 - 0.25), V3(cfg.portaX, 1.2, cfg.D / 2 - 4.2)]; cfg.v0 = true; }
      const resto = restoDe(sub); if (cfg.estoque && resto.length) await guardar(g, id, resto, alvos, L);
      // um spot no teto em cima de cada quadro, com o disquinho aceso no forro
      const disco = mat("spot", () => new T.MeshStandardMaterial({ color: "#fff2dc", emissive: new T.Color("#ffd8a0"), emissiveIntensity: 1.2 }));
      for (const a of alvos) if (a.foco) { const [de, para] = a.foco; de.y = cfg.H - 0.02; const sp = new T.SpotLight("#ffd29a", 0.5, 4, 0.42, 0.8, 2); sp.position.copy(de); sp.target.position.copy(para); scene.add(sp, sp.target); L.focos.push(sp);
        const dk = new T.Mesh(new T.CircleGeometry(0.055, 16), disco); dk.rotation.x = Math.PI / 2; dk.position.copy(de).setY(cfg.H - 0.004); g.add(dk); }
      // sombras: tudo projeta e recebe, menos vidros, lâmpadas e o lado de fora
      g.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = !o.userData.semSombra; } });
      // o reflexo do céu fica bem fraco (senão ele vira uma luz ambiente que clareia tudo)
      scene.environment = (M.ceu[M.tema === "noite" ? "noite" : "entardecer"] || {}).env || null;
      g.traverse((o) => { if (o.isMesh && o.material && o.material.envMapIntensity != null) o.material.envMapIntensity = 0.1; });
      const camera = new T.PerspectiveCamera(58, innerWidth / innerHeight, 0.05, 60);
      const rc = new T.Raycaster(), ptr = new T.Vector2();
      const pick = (x, y) => { ptr.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); rc.setFromCamera(ptr, camera); let melhor = null, dm = 1e9;
        for (const a of alvos) { const h = rc.intersectObject(a.obj, true)[0]; if (h && h.distance < dm) { dm = h.distance; melhor = a; } } return melhor ? { nome: melhor.nome, acao: melhor.acao } : null; };
      const d = { scene, camera, alvos, pick, cfg, sub, id, hemi, sol, facho, L, fora: g.userData.fora, vista: 0, olho: cfg.vistas[0][0].clone(), mira: cfg.vistas[0][1].clone() };
      // ao abrir uma atividade, a câmera chega perto do quadro dela; ao fechar o pergaminho, volta para a vista
      for (const a of alvos) if (a.perto) { const ac = a.acao; a.acao = () => { d.perto = a.perto; ac(); }; }
      // os shaders da sala compilam aqui, ainda atrás do véu, e não no primeiro quadro dentro dela
      luzDoTema(d); if (M.prepararGPU) await M.prepararGPU(scene, camera);
      return d;
    }
    // a janela e a luz mudam com o tema: noite é luar azulado, entardecer é sol laranja
    function luzDoTema(d) {
      const n = M.tema === "noite", L = d.L;
      d.sol.intensity = n ? 0 : 6; d.facho.visible = !n; // intensidade 0, e não invisível: o número de luzes não muda e nada recompila d.hemi.intensity = n ? 0.03 : 0.05;
      for (const l of L.luzes) l.intensity = n ? (d.cfg.tech ? 1.7 : 1.4) : (d.cfg.tech ? 0.6 : 0.62);
      for (const l of L.focos) l.intensity = (n ? 1.3 : 0.8) * (l.userData.k || 1);
      for (const m of L.vidros) m.emissiveIntensity = n ? 1.8 : 0.9;
      if (d.fora) ceuLaFora(d.fora);
      d.scene.environment = (M.ceu[n ? "noite" : "entardecer"] || {}).env || null;
    }
    // o raio de sol visível no ar: a porta "arrastada" na direção do sol até o chão, bem fraco e somado à cena
    const fachoTex = M.canvasTex(64, 128, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0.15)"); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      const lx = c.createLinearGradient(0, 0, w, 0); lx.addColorStop(0, "rgba(0,0,0,1)"); lx.addColorStop(0.25, "rgba(0,0,0,0)"); lx.addColorStop(0.75, "rgba(0,0,0,0)"); lx.addColorStop(1, "rgba(0,0,0,1)"); c.globalCompositeOperation = "destination-out"; c.fillStyle = lx; c.fillRect(0, 0, w, h); });
    function feixe(cfg, sol) {
      const { D } = cfg, px = cfg.portaX, pw = 1.0, ph = 2.15, z = D / 2 - 0.05;
      const dir = sol.target.position.clone().sub(sol.position).normalize();
      const chao = (p) => p.clone().addScaledVector(dir, p.y / -dir.y);
      const A = V3(px - pw / 2, ph, z), B = V3(px + pw / 2, ph, z), C = V3(px - pw / 2, 0.1, z), E = V3(px + pw / 2, 0.1, z);
      const pos = [], uv = [];
      const quad = (p0, p1, q0, q1) => { for (const [p, u, v] of [[p0, 0, 0], [p1, 1, 0], [q1, 1, 1], [p0, 0, 0], [q1, 1, 1], [q0, 0, 1]]) { pos.push(p.x, p.y, p.z); uv.push(u, v); } };
      quad(A, B, chao(A), chao(B)); quad(A, C, chao(A), chao(C)); quad(B, E, chao(B), chao(E));
      const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
      const m = new T.Mesh(geo, new T.MeshBasicMaterial({ map: fachoTex, color: "#ffb878", transparent: true, opacity: 0.07, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }));
      m.frustumCulled = false; return m;
    }
    let ox = 0, oy = 0, arr = null;
    addEventListener("pointermove", (e) => { if (!M.dentro) return; if (e.pointerType === "mouse") { ox = (e.clientX / innerWidth - 0.5) * 1.1; oy = (e.clientY / innerHeight - 0.5) * 0.5; } else if (arr) { ox = Math.max(-1, Math.min(1, ox - (e.clientX - arr[0]) / innerWidth * 2)); oy = Math.max(-0.4, Math.min(0.4, oy - (e.clientY - arr[1]) / innerHeight)); arr = [e.clientX, e.clientY]; } });
    addEventListener("pointerdown", (e) => { if (M.dentro && e.pointerType !== "mouse") arr = [e.clientX, e.clientY]; });
    addEventListener("pointerup", () => { arr = null; });
    const tmp = new T.Vector3();
    const EXP = 1.0;
    M.aoFecharPainel = () => { if (M.dentro) M.dentro.perto = null; };
    M.ticks.push((t, dt) => { const d = M.dentro; if (!d || d.corte) return; const [a, b] = d.perto || d.cfg.vistas[d.vista];
      for (const v of girando) if (v.parent && v.parent.parent === d.scene) v.rotation.y += 0.025;
      d.olho.lerp(a, 0.06); d.mira.lerp(b, 0.06); d.camera.position.copy(d.olho); d.camera.position.y += Math.sin(t * 0.6) * 0.008;
      tmp.copy(d.mira).sub(d.olho).applyAxisAngle(V3(0, 1, 0), -ox * 0.8); tmp.y -= oy * tmp.length() * 0.6; d.camera.lookAt(tmp.add(d.olho)); });
    addEventListener("resize", () => { if (M.dentro) { M.dentro.camera.aspect = innerWidth / innerHeight; M.dentro.camera.updateProjectionMatrix(); } });
    const rotulo = () => { const d = M.dentro; if (!d) return; const noEst = d.cfg.vistas[d.vista][2];
      nome.innerHTML = `${esc(noEst ? "O estoque, nos fundos" : d.cfg.titulo)}<small>${esc(d.sub.name)} · vista ${d.vista + 1} de ${d.cfg.vistas.length} · toque nos quadros para abrir</small>`; };
    const mudarVista = (k) => { const d = M.dentro; if (!d || d.corte) return; d.perto = null; const de = d.cfg.vistas[d.vista]; d.vista = (d.vista + k + d.cfg.vistas.length) % d.cfg.vistas.length; ox = oy = 0; rotulo();
      const para = d.cfg.vistas[d.vista]; if (!de[2] && !para[2]) return;
      // entrar ou sair do estoque é um corte (a câmera não atravessa a parede)
      d.corte = true; veu.classList.add("on"); setTimeout(() => { d.olho.copy(para[0]); d.mira.copy(para[1]); d.corte = false; setTimeout(() => veu.classList.remove("on"), 60); }, 400); };
    ui.children[0].onclick = () => mudarVista(-1); ui.children[2].onclick = () => mudarVista(1);
    M.vistaSala = mudarVista;

    let expFora = null;
    M.aoTema = () => { const d = M.dentro; if (!d) return; expFora = renderer.toneMappingExposure; luzDoTema(d); renderer.toneMappingExposure = EXP; renderer.shadowMap.needsUpdate = true; };
    /* o sininho da porta (furin de loja): três parciais de sino, com batidas leves, tocado pelo próprio navegador */
    function sino() { try { const ac = M.audioCtx || (M.audioCtx = new (window.AudioContext || window.webkitAudioContext)()); if (ac.state === "suspended") ac.resume();
      const t0 = ac.currentTime, out = ac.createGain(); out.gain.value = 0.22; out.connect(ac.destination);
      [0, 0.16, 0.34].forEach((dt, k) => [[2093, 1], [2637, 0.55], [3520, 0.3], [5274, 0.12]].forEach(([f, a]) => { const o = ac.createOscillator(), gg = ac.createGain(); o.type = "sine"; o.frequency.value = f * (1 + k * 0.004);
        gg.gain.setValueAtTime(0, t0 + dt); gg.gain.linearRampToValueAtTime(a * (1 - k * 0.25), t0 + dt + 0.005); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 1.6 - k * 0.2); o.connect(gg); gg.connect(out); o.start(t0 + dt); o.stop(t0 + dt + 1.7); })); } catch (e) { /* sem som */ } }
    async function entrar(id) {
      if (!SALAS[id] || M.dentro) return; sino();
      veu.classList.add("on"); M.fechar && M.fechar(); await new Promise((r) => setTimeout(r, 420));
      if (!prontas[id]) prontas[id] = construir(id);
      const d = await prontas[id]; if (!d) { veu.classList.remove("on"); return; }
      d.camera.aspect = innerWidth / innerHeight; d.camera.updateProjectionMatrix(); ox = oy = 0; d.vista = 0; d.olho.copy(d.cfg.vistas[0][0]); d.mira.copy(d.cfg.vistas[0][1]);
      luzDoTema(d); expFora = renderer.toneMappingExposure; renderer.toneMappingExposure = EXP;
      M.dentro = d; document.body.classList.add("dentro"); rotulo(); renderer.shadowMap.needsUpdate = true; // a sombra da sala é feita uma vez (nada nela se mexe)
      M.marcasSala && M.marcasSala(d.alvos.filter((a) => a.topo));
      setTimeout(() => veu.classList.remove("on"), 120);
    }
    async function sairDaLoja() { if (!M.dentro) return; veu.classList.add("on"); await new Promise((r) => setTimeout(r, 380)); M.fechar && M.fechar(); M.dentro = null; if (expFora != null) renderer.toneMappingExposure = expFora; M.refazSombra && M.refazSombra(); document.body.classList.remove("dentro"); M.marcasSala && M.marcasSala([]); setTimeout(() => veu.classList.remove("on"), 120); }
    M.entrar = entrar; M.sair = sairDaLoja; M.temSala = (id) => !!SALAS[id];
    // dentro de uma loja, o celular mostra o que se pode abrir ali (pelo nome) e o botão de sair
    M.acoesDentro = () => { const d = M.dentro; if (!d) return []; const vis = new Set(); const a = [];
      d.alvos.forEach((x, i) => { if (x.topo && x.nome && !vis.has(x.nome)) { vis.add(x.nome); a.push({ id: "alvo:" + i, t: x.nome }); } });
      return a.concat([{ id: "sair", t: "Sair da " + (d.cfg.titulo || "loja").replace(/^(A|O) /, "").toLowerCase() }]); };
    M.fazerDentro = (id) => { const d = M.dentro; if (!d) return; if (id === "sair") return sairDaLoja(); const k = +id.split(":")[1]; const x = d.alvos[k]; if (x && x.acao) x.acao(); };
    sair.addEventListener("click", sairDaLoja);
    addEventListener("keydown", (e) => { if (!M.dentro || (M.painelAberto && M.painelAberto())) return; if (e.key === "Escape") sairDaLoja(); else if (["ArrowRight", "ArrowDown", "PageDown"].includes(e.key)) mudarVista(1); else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) mudarVista(-1); });
  });
})();
