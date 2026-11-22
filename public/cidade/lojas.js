/* Dentro das lojas. Cada loja da rua tem a sua sala, montada com móveis e objetos prontos do Poly Haven (CC0):
   a cafeteria (Quem sou), Matemática, Linguagens, Ciências Humanas, Ciências da Natureza e a loja maior do curso
   técnico, com um computador para cada matéria. As atividades ficam em quadros na parede, com a imagem de cada uma;
   tocar no quadro (ou no nome aceso) abre a atividade. Cada sala só é baixada na primeira vez que alguém entra. */
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

    /* ---------- a caixa da sala: piso, paredes, rodapé e teto com textura de verdade ---------- */
    function sala(cfg) {
      const g = new T.Group(), { W, D, H } = cfg;
      const piso = new T.Mesh(new T.PlaneGeometry(W, D), M.pbr(cfg.piso, [W / 2, D / 2], { metalness: 0, color: cfg.corPiso || "#ffffff" })); piso.rotation.x = -Math.PI / 2; g.add(piso);
      const pm = M.pbr(cfg.parede, [W / 2.5, H / 2.5], { metalness: 0, color: cfg.corParede || "#ffffff" });
      const parede = (w, x, z, ry) => { const p = new T.Mesh(new T.PlaneGeometry(w, H), pm); p.position.set(x, H / 2, z); p.rotation.y = ry; g.add(p); };
      parede(W, 0, -D / 2, 0); parede(D, -W / 2, 0, Math.PI / 2); parede(D, W / 2, 0, -Math.PI / 2); parede(W, 0, D / 2, Math.PI);
      const teto = new T.Mesh(new T.PlaneGeometry(W, D), new T.MeshStandardMaterial({ color: cfg.corTeto || "#3a2a20", roughness: 0.9 })); teto.rotation.x = Math.PI / 2; teto.position.y = H; g.add(teto);
      // rodapé e uma faixa de madeira na altura da mão, como nas casas japonesas
      const mad = M.pbr("dark_wooden_planks", [4, 0.2], { metalness: 0, color: "#a08070" });
      for (const [w, x, z, ry] of [[W, 0, -D / 2 + 0.02, 0], [D, -W / 2 + 0.02, 0, Math.PI / 2], [D, W / 2 - 0.02, 0, -Math.PI / 2]]) {
        for (const [y, hh] of [[0.09, 0.18], [0.95, 0.06], [H - 0.06, 0.12]]) { const b = new T.Mesh(new T.BoxGeometry(w, hh, 0.04), mad); b.position.set(x, y, z); b.rotation.y = ry; g.add(b); } }
      return g;
    }
    // um objeto pronto na sala: posição, giro e escala (opcional: troca o material de nome `re` por `mat`)
    async function por(g, n, x, y, z, ry = 0, s = 1) {
      const m = await modelo(n); if (!m) return null; const o = m.clone(true); o.position.set(x, y, z); o.rotation.y = ry; o.scale.setScalar(s);
      o.traverse((c) => { if (c.isMesh) { c.material = c.material.clone(); } }); g.add(o); return o;
    }
    const trocar = (o, re, fn) => { if (o) o.traverse((c) => { if (c.isMesh && re.test(c.material.name || "")) fn(c); }); };

    /* ---------- texturas: a imagem da atividade (enquadrada sem distorcer), cartões de texto, tela de PC, giz ---------- */
    // coordenadas de textura novas, projetando a superfície no seu próprio plano: assim a imagem cobre a tela inteira
    // do quadro (ou do computador) sem depender de como o modelo foi feito. Devolve a proporção largura/altura.
    function uvPlano(mesh, espelhar) {
      const g = mesh.geometry; if (g.userData.uvPlano) return g.userData.uvPlano;
      const P = M.lerF(g.attributes.position), n = P.length / 3, mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[i * 3 + k]); mx[k] = Math.max(mx[k], P[i * 3 + k]); }
      const ext = [0, 1, 2].map((k) => mx[k] - mn[k]); const eu = ext[0] >= ext[2] ? 0 : 2, ev = 1;
      const uv = new Float32Array(n * 2); for (let i = 0; i < n; i++) { let u = (P[i * 3 + eu] - mn[eu]) / (ext[eu] || 1); if (espelhar) u = 1 - u; uv[i * 2] = u; uv[i * 2 + 1] = (P[i * 3 + ev] - mn[ev]) / (ext[ev] || 1); }
      g.setAttribute("uv", new T.BufferAttribute(uv, 2)); const s0 = new T.Vector3(); mesh.getWorldScale(s0);
      const ra = (ext[eu] * (eu === 0 ? s0.x : s0.z)) / Math.max(1e-6, ext[ev] * s0.y); g.userData.uvPlano = ra || 1; return g.userData.uvPlano;
    }
    function imagemNoQuadro(mesh, url, titulo, corpo) {
      const fa = uvPlano(mesh);
      const usar = (t, ia) => { t.encoding = T.sRGBEncoding; t.flipY = true; t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
        if (ia > fa) { t.repeat.set(fa / ia, 1); t.offset.set((1 - fa / ia) / 2, 0); } else { t.repeat.set(1, ia / fa); t.offset.set(0, (1 - ia / fa) / 2); }
        mesh.material = new T.MeshStandardMaterial({ map: t, roughness: 0.6, emissive: new T.Color("#ffffff"), emissiveMap: t, emissiveIntensity: 0.12 }); };
      if (url) texL.load(imgUrl(url), (t) => usar(t, t.image.width / t.image.height), undefined, () => usar(cartao(titulo, corpo), 0.75));
      else usar(cartao(titulo, corpo), 0.75);
    }
    function cartao(titulo, corpo) {
      return M.canvasTex(384, 512, (c, w, h) => { c.fillStyle = "#efe4cc"; c.fillRect(0, 0, w, h); c.strokeStyle = "#b5301b"; c.lineWidth = 6; c.strokeRect(16, 16, w - 32, h - 32);
        const quebra = (txt, max) => { const out = []; let l = ""; for (const p of String(txt || "").split(/\s+/)) { if (c.measureText(l + " " + p).width > max && l) { out.push(l); l = p; } else l = l ? l + " " + p : p; } if (l) out.push(l); return out; };
        c.fillStyle = "#2a2220"; c.textAlign = "center"; c.font = `600 40px ${M.JP}`; const tl = quebra(titulo, w - 70).slice(0, 3); tl.forEach((l, i) => c.fillText(l, w / 2, 86 + i * 48));
        c.fillStyle = "#b5301b"; c.fillRect(w / 2 - 40, 86 + tl.length * 48 - 18, 80, 3);
        if (corpo) { c.fillStyle = "#4a3a32"; c.font = `22px ${M.JP}`; quebra(corpo, w - 70).slice(0, 11).forEach((l, i) => c.fillText(l, w / 2, 110 + tl.length * 48 + i * 30)); } });
    }
    function telaPC(nome, kanji, cor) {
      const t = M.canvasTex(512, 384, (c, w, h) => { c.fillStyle = "#0e1420"; c.fillRect(0, 0, w, h); c.fillStyle = cor; c.fillRect(0, 0, w, 34); c.fillStyle = "#0e1420"; c.font = "600 18px monospace"; c.fillText("  " + nome, 8, 23);
        c.font = `700 120px ${M.JPS}`; c.fillStyle = cor; c.globalAlpha = 0.9; c.textAlign = "center"; c.fillText(kanji, w / 2, 210); c.globalAlpha = 1; c.textAlign = "left";
        c.font = "15px monospace"; const linhas = ["$ abrir atividades", "> carregando...", "> pronto", "_"]; linhas.forEach((l, i) => { c.fillStyle = i === 2 ? "#7fe08a" : "#a8b8d0"; c.fillText(l, 22, 280 + i * 22); }); });
      return t;
    }
    function giz() {
      return M.canvasTex(640, 1024, (c, w, h) => { c.fillStyle = "#24302a"; c.fillRect(0, 0, w, h); c.strokeStyle = "rgba(240,240,230,.85)"; c.fillStyle = "rgba(240,240,230,.9)"; c.lineWidth = 3;
        c.font = `700 90px ${M.JPS}`; c.fillText("数学", 40, 120); c.font = "italic 46px Georgia, serif";
        ["f(x) = ax² + bx + c", "Δ = b² − 4ac", "x = (−b ± √Δ) / 2a", "a² + b² = c²", "π ≈ 3,14159"].forEach((l, i) => c.fillText(l, 40, 230 + i * 82));
        c.beginPath(); c.moveTo(60, 960); c.lineTo(580, 960); c.moveTo(80, 990); c.lineTo(80, 700); c.stroke(); c.beginPath(); for (let x = 0; x <= 460; x += 4) { const y = 950 - Math.pow((x - 230) / 55, 2) * 14 - 10; x ? c.lineTo(90 + x, y) : c.moveTo(90 + x, y); } c.stroke(); });
    }

    /* ---------- as salas ---------- */
    const KANJI = { perfil: ["喫茶", "#2a3a5a"], natureza: ["理科", "#2a6a46"], humanas: ["社会", "#5a3a22"], linguagens: ["国語", "#8a6a3a"], matematica: ["数学", "#2a4a8a"], tecnico: ["技術", "#1a7a8a"],
      modelagem: ["設計", "#7a5a2a"], desenvolvimento: ["開発", "#c8281e"], "programacao-aplicativos": ["アプリ", "#c89a20"], iot: ["電子", "#5a3a9a"], banco: ["データ", "#b5301b"] };
    M.KANJI = KANJI;
    // onde ficam os quadros, por tamanho de sala: [x, y, z, giro]
    const vagas = (W, D, n) => { const out = [], back = Math.min(n, 3); for (let i = 0; i < back; i++) out.push([(i - (back - 1) / 2) * 2.0, 1.75, -D / 2 + 0.06, 0]);
      let r = n - back, k = 0; while (r > 0) { const lado = k % 2 ? -1 : 1, j = Math.floor(k / 2); out.push([lado * (W / 2 - 0.06), 1.75, -D / 2 + 1.7 + j * 1.9, -lado * Math.PI / 2]); r--; k++; } return out; };
    const QUADROS = ["hanging_picture_frame_02", "hanging_picture_frame_03", "hanging_picture_frame_01", "fancy_picture_frame_01"];
    async function quadros(g, id, sub, W, D, alvos, modeloQ = "hanging_picture_frame_02", esc0 = 1.7) {
      const vs = vagas(W, D, sub.acts.length);
      await Promise.all(sub.acts.map(async (a, i) => { const [x, y, z, ry] = vs[i]; const q = await por(g, modeloQ, x, y, z, ry, esc0); if (!q) return;
        trocar(q, /artwork|canvas/, (c) => imagemNoQuadro(c, a.img, a.t, a.r)); trocar(q, /glass/, (c) => { c.visible = false; });
        q.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(q);
        alvos.push({ obj: q, nome: a.t, acao: () => M.abrirAtividade(id, i), topo: V3((bb.min.x + bb.max.x) / 2, bb.max.y + 0.12, (bb.min.z + bb.max.z) / 2) }); }));
    }
    const SALAS = {
      perfil: { titulo: "A cafeteria", W: 8, D: 7, H: 3.3, piso: "wood_floor", parede: "beige_wall_001", corParede: "#e8d6c0", luz: "#ffc890",
        async montar(g, sub, alvos) {
          await Promise.all([por(g, "CoffeeCart_01", -2.3, 0, -2.75, 0, 1), por(g, "round_wooden_table_01", 0.6, 0, -0.4, 0, 0.8), por(g, "tea_set_01", 0.6, 0.8, -0.4, 0.4, 1),
            por(g, "bar_chair_round_01", -0.4, 0, 0.1, 0.8, 1), por(g, "bar_chair_round_01", 1.5, 0, 0.1, -0.6, 1), por(g, "chinese_tea_table", 2.7, 0, -2.3, 0, 1), por(g, "chinese_armchair", 3.3, 0, -1.4, -2.2, 1),
            por(g, "vintage_electric_kettle", -1.6, 1.06, -2.7, 0.3, 1), por(g, "CashRegister_01", -3.0, 1.06, -2.6, 0.4, 0.8), por(g, "chinese_chandelier", 0.6, 3.3, -0.4, 0, 1),
            por(g, "potted_plant_04", 2.7, 0.5, -2.3, 0, 1.6), por(g, "ceramic_vase_01", 3.5, 0, 2.6, 0, 2), por(g, "wall_clock", 2.6, 2.6, -3.44, 0, 1.3)]);
          await quadros(g, "perfil", sub, 8, 7, alvos, "hanging_picture_frame_01", 1.6);
        } },
      matematica: { titulo: "A sala de Matemática", W: 8, D: 7, H: 3.3, piso: "dark_wooden_planks", parede: "white_plaster_02", corParede: "#e8e4d8", luz: "#fff0d8",
        async montar(g, sub, alvos) {
          const lousa = await por(g, "standing_chalkboard_01", -2.5, 0, -2.0, 0.55, 1.45); trocar(lousa, /board/, (c) => { uvPlano(c, M.Q.has("lousa-espelho")); c.material = new T.MeshStandardMaterial({ map: giz(), roughness: 0.9, side: T.DoubleSide }); });
          await Promise.all([por(g, "painted_wooden_table", 0, 0, 0.6, 0, 0.9), por(g, "chess_set", -0.4, 0.86, 0.6, 0.3, 1), por(g, "binder_notebook", 0.5, 0.86, 0.5, -0.2, 1), por(g, "stationery_supplies", 0.75, 0.93, 0.75, 0.4, 1),
            por(g, "SchoolChair_01", -0.6, 0, 1.5, Math.PI, 1), por(g, "SchoolChair_01", 0.6, 0, 1.5, Math.PI, 1), por(g, "wall_clock", 0, 2.75, -3.44, 0, 1.4),
            por(g, "Shelf_01", 3.3, 0, -2.2, -Math.PI / 2, 1), por(g, "book_encyclopedia_set_01", 3.3, 1.02, -2.4, -Math.PI / 2, 1), por(g, "potted_plant_04", -3.4, 0, 2.6, 0, 2.2)]);
          await quadros(g, "matematica", sub, 8, 7, alvos, "hanging_picture_frame_02", 1.7);
        } },
      linguagens: { titulo: "A livraria de Linguagens", W: 8, D: 7, H: 3.3, piso: "wood_floor", parede: "painted_plaster_wall", corParede: "#e6d8c4", luz: "#ffd8a0",
        async montar(g, sub, alvos) {
          const est = []; for (const z of [-2.4, -0.7]) for (const s of [-1, 1]) est.push(por(g, "wooden_bookshelf_worn", s * 3.6, 0, z, s * -Math.PI / 2, 1));
          await Promise.all(est);
          for (const z of [-2.4, -0.7]) for (const s of [-1, 1]) for (const y of [0.42, 0.9, 1.38]) for (const dz of [-0.35, 0.25]) await por(g, "book_encyclopedia_set_01", s * 3.6, y, z + dz, s * -Math.PI / 2, 1);
          await Promise.all([por(g, "ArmChair_01", 1.6, 0, 1.2, -2.5, 1), por(g, "side_table_01", 2.4, 0, 0.6, 0, 1), por(g, "vintage_oil_lamp", 2.4, 0.55, 0.6, 0, 0.7), por(g, "painted_wooden_table", -0.6, 0, 0.4, 0, 0.75),
            por(g, "book_encyclopedia_set_01", -0.9, 0.72, 0.4, 0.2, 1), por(g, "desk_lamp_arm_01", -1.3, 0.72, 0.2, 0.6, 1), por(g, "potted_plant_04", 0, 0.72, 0.5, 0, 1.4)]);
          await quadros(g, "linguagens", sub, 8, 7, alvos, "hanging_picture_frame_02", 1.6);
        } },
      humanas: { titulo: "O antiquário de Ciências Humanas", W: 8, D: 7, H: 3.3, piso: "tatami_mat", parede: "beige_wall_001", corParede: "#d8c8b0", luz: "#ffc070",
        async montar(g, sub, alvos) {
          await Promise.all([por(g, "chinese_cabinet", -3.2, 0, -2.9, 0.5, 0.85), por(g, "chinese_cabinet", 3.2, 0, -2.9, -0.5, 0.85), por(g, "chinese_commode", 0, 0, 0.2, 0, 0.55),
            por(g, "marble_bust_01", -0.7, 1.1, 0.2, 0.3, 1.4), por(g, "mantel_clock_01", 0.3, 1.1, 0.2, -0.2, 1.4), por(g, "seadogs_compass", 0.9, 1.1, 0.3, 0.6, 2.2), por(g, "vintage_binocular", 1.2, 1.12, 0.1, 0.4, 1.6),
            por(g, "antique_ceramic_vase_01", -1.1, 1.1, 0.25, 0, 1.4), por(g, "vintage_suitcase", -2.6, 0, 1.8, 0.4, 0.9), por(g, "chinese_armchair", 2.8, 0, 1.6, -2.4, 1), por(g, "chinese_chandelier", 0, 3.3, -0.6, 0, 1)]);
          await quadros(g, "humanas", sub, 8, 7, alvos, "fancy_picture_frame_01", 2.2);
        } },
      natureza: { titulo: "O laboratório de Ciências da Natureza", W: 8, D: 7, H: 3.3, piso: "wood_floor", parede: "white_plaster_02", corParede: "#e4ece0", luz: "#fff4e0",
        async montar(g, sub, alvos) {
          await Promise.all([por(g, "painted_wooden_table", 0, 0, 0.2, 0, 0.9), por(g, "vintage_microscope", -0.5, 0.86, 0.1, 0.4, 1.6), por(g, "wicker_basket_02", 0.4, 0.86, 0.3, 0.2, 1.3),
            por(g, "potted_plant_04", 0.9, 0.86, 0.1, 0, 1.5), por(g, "desk_lamp_arm_01", -1.0, 0.86, -0.1, 0.5, 1),
            por(g, "wooden_display_shelves_01", -3.5, 0, -2.4, 0, 1.2), por(g, "wooden_display_shelves_01", 3.5, 0, -2.4, Math.PI, 1.2),
            por(g, "planter_box_02", -2.4, 0, 2.3, 0, 1), por(g, "planter_box_02", 2.4, 0, 2.3, 0, 1)]);
          for (const s of [-1, 1]) for (const y of [0.35, 0.82, 1.3]) { await por(g, "potted_plant_04", s * 3.5, y, -2.7, rnd(), 1.4); await por(g, rnd() < 0.5 ? "ceramic_vase_01" : "ceramic_vase_03", s * 3.5, y, -2.1, 0, 0.8); }
          for (const s of [-1, 1]) for (const dx of [-0.4, 0, 0.4]) await por(g, "potted_plant_04", s * 2.4 + dx, 0.42, 2.3, rnd() * 6, 1.8);
          await quadros(g, "natureza", sub, 8, 7, alvos, "hanging_picture_frame_02", 1.6);
        } },
      tecnico: { titulo: "O laboratório do curso técnico", W: 12, D: 9, H: 3.6, piso: "wood_floor", corPiso: "#b8b4b0", parede: "white_plaster_02", corParede: "#dfe4ea", corTeto: "#2a2e34", luz: "#e8f0ff",
        async montar(g, sub, alvos) {
          // cinco mesas, uma por matéria do técnico, cada uma com o seu computador mostrando a matéria
          // as mesas em arco, viradas para quem entra, para os cinco computadores ficarem à vista
          const olhoT = V3(0, 0, 9 / 2 - 0.7), mesas = [[-3.5, -1.0], [-2.0, -3.0], [0, -3.6], [2.0, -3.0], [3.5, -1.0]].map(([x, z]) => [x, z, Math.atan2(olhoT.x - x, olhoT.z - z)]);
          await Promise.all(sub.subs.map(async (s, i) => { const [x, z, ry] = mesas[i]; const d = await por(g, "metal_office_desk", x, 0, z, ry, 1);
            const off = V3(0, 0, 0.1).applyAxisAngle(V3(0, 1, 0), ry); const pc = await por(g, "classic_laptop", x + off.x, 0.79, z + off.z, ry, 1.25);
            const [kj, cor] = KANJI[s.id] || ["技", "#7fe0ff"]; trocar(pc, /screen/, (c) => { uvPlano(c); const t = telaPC(s.name, kj, cor); c.material = new T.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new T.Color("#ffffff"), emissiveIntensity: 0.9 }); });
            const st = V3(0.7, 0, -0.75).applyAxisAngle(V3(0, 1, 0), ry); await por(g, "metal_stool_01", x + st.x, 0, z + st.z, ry, 1);
            const bb = new T.Box3().setFromObject(d);
            alvos.push({ obj: d, nome: s.name, acao: () => M.abrir(s.id), topo: V3(x, 1.75, z) }); if (pc) alvos.push({ obj: pc, nome: s.name, acao: () => M.abrir(s.id) }); }));
          const iot = mesas[3], dI = V3(0.6, 0, 0).applyAxisAngle(V3(0, 1, 0), iot[2]); await Promise.all([por(g, "circuit_board", iot[0] + dI.x, 0.8, iot[1] + dI.z, 0.3, 1), por(g, "retro_multimeter", iot[0] - dI.x, 0.79, iot[1] - dI.z, iot[2], 1.2),
            por(g, "security_camera_01", 5.8, 3.1, -4.3, -0.8, 1.2), por(g, "power_box_01", -5.9, 1.6, 3.2, Math.PI / 2, 1),
            por(g, "steel_frame_shelves_01", -4.6, 0, -4.15, 0, 0.1), por(g, "steel_frame_shelves_01", 4.6, 0, -4.15, 0, 0.1),
            por(g, "desk_lamp_arm_01", 0.7, 0.79, -3.5, -0.4, 1), por(g, "potted_plant_04", -0.8, 0.79, -3.6, 0, 1.6), por(g, "wall_clock", 0, 2.9, -4.44, 0, 1.4)]);
          for (const x of [-3, 0, 3]) for (const z of [-2.5, 1]) await por(g, "mounted_fluorescent_lights", x, 3.58, z, 0, 1.3);
        } },
    };
    function rnd() { return Math.random(); }

    /* ---------- entrar e sair ---------- */
    const css = document.createElement("style");
    css.textContent = `.sair{position:fixed;z-index:7;top:max(16px,env(safe-area-inset-top));left:16px;padding:9px 16px;border-radius:999px;border:1px solid rgba(246,238,226,.5);background:rgba(20,14,18,.55);color:#f6eee2;font:14px "Noto Serif JP",Georgia,serif;cursor:pointer;display:none;backdrop-filter:blur(4px)}
      body.dentro .sair{display:block}body.dentro .apr,body.dentro .cam-ui{display:none}
      .sala-nome{position:fixed;z-index:5;left:50%;bottom:26px;transform:translateX(-50%);color:#f6eee2;font:500 16px "Noto Serif JP",Georgia,serif;text-shadow:0 1px 8px rgba(0,0,0,.6);display:none;text-align:center}
      .sala-nome small{display:block;font-size:12px;opacity:.75;letter-spacing:.06em;margin-top:4px}body.dentro .sala-nome{display:block}
      .veu-sala{position:fixed;inset:0;z-index:9;background:#0a0810;opacity:0;pointer-events:none;transition:opacity .4s}.veu-sala.on{opacity:1}`;
    document.head.appendChild(css);
    const sair = document.createElement("button"); sair.className = "sair"; sair.type = "button"; sair.textContent = "‹ Sair da loja"; document.body.appendChild(sair);
    const nome = document.createElement("div"); nome.className = "sala-nome"; document.body.appendChild(nome);
    const veu = document.createElement("div"); veu.className = "veu-sala"; document.body.appendChild(veu);
    const prontas = {};
    async function construir(id) {
      const cfg = SALAS[id], sub = M.secao(id); if (!cfg || !sub) return null;
      const scene = new T.Scene(), g = sala(cfg); scene.add(g); const alvos = [];
      scene.environment = M.ceu.entardecer && M.ceu.entardecer.env; scene.background = new T.Color("#0a0806");
      scene.add(new T.HemisphereLight("#fff4e6", "#3a2a22", 0.55));
      const luzes = cfg.W > 9 ? [[-3, 3.2, -1], [3, 3.2, -1], [0, 3.2, 2.5]] : [[0, 3.0, -1.2], [-2.4, 2.6, 1.6], [2.4, 2.6, 1.6]];
      for (const [x, y, z] of luzes) { const l = new T.PointLight(cfg.luz, 1.3, 9, 1.6); l.position.set(x, y, z); scene.add(l); }
      await cfg.montar(g, sub, alvos);
      const camera = new T.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 60);
      const olho = V3(0, 1.62, cfg.D / 2 - 0.7), mira = V3(0, 1.45, -cfg.D / 2);
      const rc = new T.Raycaster(), ptr = new T.Vector2();
      const pick = (x, y) => { ptr.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); rc.setFromCamera(ptr, camera); let melhor = null, dm = 1e9;
        for (const a of alvos) { const h = rc.intersectObject(a.obj, true)[0]; if (h && h.distance < dm) { dm = h.distance; melhor = a; } } return melhor ? { nome: melhor.nome, acao: melhor.acao } : null; };
      return { scene, camera, olho, mira, alvos, pick, cfg, sub, id };
    }
    // olhar em volta: mouse no computador, arrastar no toque
    let ox = 0, oy = 0, arr = null;
    addEventListener("pointermove", (e) => { if (!M.dentro) return; if (e.pointerType === "mouse") { ox = (e.clientX / innerWidth - 0.5) * 1.1; oy = (e.clientY / innerHeight - 0.5) * 0.5; } else if (arr) { ox = Math.max(-1, Math.min(1, ox - (e.clientX - arr[0]) / innerWidth * 2)); oy = Math.max(-0.4, Math.min(0.4, oy - (e.clientY - arr[1]) / innerHeight)); arr = [e.clientX, e.clientY]; } });
    addEventListener("pointerdown", (e) => { if (M.dentro && e.pointerType !== "mouse") arr = [e.clientX, e.clientY]; });
    addEventListener("pointerup", () => { arr = null; });
    const tmp = new T.Vector3();
    M.ticks.push((t) => { const d = M.dentro; if (!d) return; d.camera.position.copy(d.olho); d.camera.position.y += Math.sin(t * 0.6) * 0.01;
      tmp.copy(d.mira).sub(d.olho).applyAxisAngle(V3(0, 1, 0), -ox * 0.9); tmp.y -= oy * tmp.length() * 0.6; d.camera.lookAt(tmp.add(d.olho)); });
    addEventListener("resize", () => { if (M.dentro) { M.dentro.camera.aspect = innerWidth / innerHeight; M.dentro.camera.updateProjectionMatrix(); } });

    async function entrar(id) {
      if (!SALAS[id] || M.dentro) return;
      veu.classList.add("on"); M.fechar && M.fechar(); await new Promise((r) => setTimeout(r, 420));
      if (!prontas[id]) prontas[id] = construir(id);
      const d = await prontas[id]; if (!d) { veu.classList.remove("on"); return; }
      d.camera.aspect = innerWidth / innerHeight; d.camera.updateProjectionMatrix(); ox = oy = 0;
      M.dentro = d; document.body.classList.add("dentro"); nome.innerHTML = `${esc(d.cfg.titulo)}<small>${esc(d.sub.name)} · toque nos quadros para abrir</small>`;
      M.marcasSala && M.marcasSala(d.alvos.filter((a) => a.topo));
      setTimeout(() => veu.classList.remove("on"), 120);
    }
    async function sairDaLoja() { if (!M.dentro) return; veu.classList.add("on"); await new Promise((r) => setTimeout(r, 380)); M.fechar && M.fechar(); M.dentro = null; document.body.classList.remove("dentro"); M.marcasSala && M.marcasSala([]); setTimeout(() => veu.classList.remove("on"), 120); }
    M.entrar = entrar; M.sair = sairDaLoja; M.temSala = (id) => !!SALAS[id];
    sair.addEventListener("click", sairDaLoja);
    addEventListener("keydown", (e) => { if (e.key === "Escape" && M.dentro && !(M.painelAberto && M.painelAberto())) sairDaLoja(); });
  });
})();
