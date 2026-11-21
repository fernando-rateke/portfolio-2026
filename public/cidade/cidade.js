/* A cidade: uma rua estreita de bairro japonês ao entardecer. Tudo o que é objeto vem de modelos prontos
   (Poly Haven, CC0); o código só monta a rua, a luz, o céu e os detalhes de papel e luz. */
(() => {
  const T = window.THREE;
  const canvas = document.getElementById("c");
  const Q = new URLSearchParams(location.search);
  /* modo Leve ou Completo: escolhido na abertura ou no botão do canto e guardado no navegador; sem escolha,
     celular e tablet começam no Leve. ?leve e ?completo na URL forçam um dos dois.
     Leve: sem sombras, sem o reflexo de verdade no lago, menos plantas, flores e vaga-lumes, resolução menor e a
     névoa um pouco mais perto (o que some nela não é desenhado). Completo: tudo ligado. */
  const toque = matchMedia("(pointer: coarse)").matches;
  let pesoSalvo = null; try { pesoSalvo = localStorage.getItem("cidade-peso"); } catch (e) { /* sem storage */ }
  const peso = Q.has("leve") ? "leve" : Q.has("completo") ? "completo" : pesoSalvo === "leve" || pesoSalvo === "completo" ? pesoSalvo : toque ? "leve" : "completo";
  const leve = peso === "leve";
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, leve ? 1 : toque ? 1.25 : 1.5));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.68;
  renderer.shadowMap.enabled = !leve; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(48, 1, 0.1, 600);
  camera.layers.enable(1); // camada 1: detalhes do chão que ficam fora do reflexo do lago
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  const loader = new T.GLTFLoader(), texL = new T.TextureLoader();
  if (window.MeshoptDecoder) loader.setMeshoptDecoder(window.MeshoptDecoder);
  const load = (f) => new Promise((ok) => loader.load("/cidade/modelos/" + f + ".glb", (g) => ok(g.scene), undefined, () => ok(null)));
  let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  /* ---------------- céu e luz ---------------- */
  texL.load("/cidade/tex/sky.jpg", (t) => {
    t.mapping = T.EquirectangularReflectionMapping; t.encoding = T.sRGBEncoding;
    scene.background = t; const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(t).texture;
  });
  scene.fog = new T.FogExp2("#b98a7a", leve ? 0.0082 : 0.0068);
  const sun = new T.DirectionalLight("#ff9a58", 2.4); sun.position.set(-26, 11, -72); sun.castShadow = true;
  sun.shadow.mapSize.set(toque ? 1024 : 2048, toque ? 1024 : 2048); Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 95 }); sun.shadow.bias = -0.0004; scene.add(sun);
  scene.add(new T.HemisphereLight("#8f86b8", "#4a3028", 0.3));

  /* ---------------- materiais com textura de verdade ---------------- */
  const texCache = new Map();
  const tx = (name, f, rep, srgb) => { const key = name + f + rep; if (texCache.has(key)) return texCache.get(key); const t = texL.load(`/cidade/tex/${name}_${f}.webp`); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; if (srgb) t.encoding = T.sRGBEncoding; texCache.set(key, t); return t; };
  function pbr(name, rep, extra) {
    const arm = tx(name, "arm", rep);
    return new T.MeshStandardMaterial(Object.assign({ map: tx(name, "diff", rep, true), normalMap: tx(name, "nor", rep), roughnessMap: arm, metalnessMap: arm, metalness: 1, roughness: 1 }, extra || {}));
  }

  /* ---------------- a rua ---------------- */
  const LEN = 96, RW = 5.2, SW = 1.6, ZC = -16; // comprimento, largura da pista, calçada, centro da rua em z
  const road = new T.Mesh(new T.PlaneGeometry(RW, LEN), pbr("asphalt_02", [RW / 4, LEN / 4])); road.rotation.x = -Math.PI / 2; road.position.z = ZC; road.receiveShadow = true; scene.add(road);
  for (const sd of [-1, 1]) {
    const walk = new T.Mesh(new T.BoxGeometry(SW, 0.12, LEN), pbr("brick_pavement_02", [SW / 2, LEN / 2])); walk.position.set(sd * (RW / 2 + SW / 2), 0.06, ZC); walk.receiveShadow = true; scene.add(walk);
    const curb = new T.Mesh(new T.BoxGeometry(0.14, 0.14, LEN), pbr("concrete", [0.2, LEN / 2])); curb.position.set(sd * (RW / 2 + 0.07), 0.07, ZC); curb.receiveShadow = true; scene.add(curb);
    // a faixa branca da beira da pista, típica das ruas japonesas
    const line = new T.Mesh(new T.PlaneGeometry(0.12, LEN), new T.MeshStandardMaterial({ color: "#e8e6e0", roughness: 0.6 })); line.rotation.x = -Math.PI / 2; line.position.set(sd * (RW / 2 - 0.45), 0.005, ZC); scene.add(line);
  }
  // 止まれ pintado no chão, perto da câmera
  { const c = document.createElement("canvas"); c.width = 512; c.height = 256; const g = c.getContext("2d"); g.fillStyle = "rgba(240,238,232,0.92)"; g.font = "900 190px 'Hiragino Sans', 'Noto Sans JP', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("止まれ", 256, 128);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; const m = new T.Mesh(new T.PlaneGeometry(2.4, 3.4), new T.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.7 })); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.006, 13); scene.add(m); }

  /* ---------------- prédios montados com o kit de fachada ---------------- */
  const shadowOn = (o) => o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  /* juntar: tudo o que não se mexe vira poucas malhas, uma por material e por pedaço do mapa (o pedaço deixa a
     câmera ignorar o que está fora da tela). Luzes e peças animadas (userData.anima) voltam para a cena como estão. */
  const lerF = (a) => { const n = a.count, k = a.itemSize, out = new Float32Array(n * k); const il = a.isInterleavedBufferAttribute, arr = il ? a.data.array : a.array, st = il ? a.data.stride : k, of = il ? a.offset : 0;
    const den = !a.normalized ? 1 : arr instanceof Int16Array ? 1 / 32767 : arr instanceof Uint16Array ? 1 / 65535 : arr instanceof Int8Array ? 1 / 127 : arr instanceof Uint8Array ? 1 / 255 : 1;
    for (let i = 0; i < n; i++) for (let c = 0; c < k; c++) { let v = arr[i * st + of + c] * den; if (a.normalized && den !== 1 && (arr instanceof Int16Array || arr instanceof Int8Array)) v = Math.max(-1, v); out[i * k + c] = v; } return out; };
  function juntar(group, cell = 30, alvo = scene) {
    group.updateMatrixWorld(true);
    const soltos = []; group.traverse((o) => { if (o.isLight || o.isInstancedMesh || (o.isMesh && o.userData.anima)) soltos.push(o); });
    for (const o of soltos) { alvo.attach(o); if (o.target && o.target.parent !== alvo) alvo.attach(o.target); }
    const by = new Map(), v = new T.Vector3(), nm = new T.Matrix3(), ctr = new T.Vector3();
    group.traverse((o) => {
      if (!o.isMesh) return; const g = o.geometry; if (!g.attributes.position) return;
      if (!g.boundingSphere) g.computeBoundingSphere(); ctr.copy(g.boundingSphere.center).applyMatrix4(o.matrixWorld);
      const ck = Math.floor(ctr.z / cell) + ":" + Math.floor(ctr.x / cell);
      const P = lerF(g.attributes.position), N = g.attributes.normal ? lerF(g.attributes.normal) : null, U = g.attributes.uv ? lerF(g.attributes.uv) : null, I = g.index ? g.index.array : null;
      nm.getNormalMatrix(o.matrixWorld);
      const grupos = Array.isArray(o.material) && g.groups.length ? g.groups : [{ start: 0, count: I ? I.length : P.length / 3, materialIndex: 0 }];
      for (const gr of grupos) {
        const m = Array.isArray(o.material) ? o.material[gr.materialIndex] : o.material; const key = m.uuid + "|" + ck;
        let e = by.get(key); if (!e) by.set(key, (e = { m, p: [], n: [], u: [], sh: o.castShadow }));
        for (let k = gr.start; k < gr.start + gr.count; k++) { const i = I ? I[k] : k;
          v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).applyMatrix4(o.matrixWorld); e.p.push(v.x, v.y, v.z);
          if (N) { v.set(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]).applyMatrix3(nm).normalize(); e.n.push(v.x, v.y, v.z); } else e.n.push(0, 1, 0);
          if (U) e.u.push(U[i * 2], U[i * 2 + 1]); else e.u.push(0, 0); }
      }
    });
    const out = new T.Group();
    for (const e of by.values()) { const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(e.p, 3)); geo.setAttribute("normal", new T.Float32BufferAttribute(e.n, 3)); geo.setAttribute("uv", new T.Float32BufferAttribute(e.u, 2)); geo.computeBoundingSphere();
      const mesh = new T.Mesh(geo, e.m); mesh.castShadow = e.sh; mesh.receiveShadow = true; out.add(mesh); longe.push(mesh); }
    if (group.parent) group.parent.remove(group); alvo.add(out); return out;
  }
  let KIT = null;
  const piece = (name) => { const o = KIT.getObjectByName(name); if (!o) { console.warn("sem peça", name); return new T.Group(); } const c = o.clone(true); c.position.set(0, 0, 0); c.rotation.set(0, 0, 0); return c; };
  const greyCache = new Map();
  function greyMap(t) { if (!t || !t.image) return t; if (greyCache.has(t)) return greyCache.get(t); const im = t.image, c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const g = c.getContext("2d"); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), a = d.data; for (let i = 0; i < a.length; i += 4) { const l = (a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11); const v = 150 + (l - 150) * 0.9; a[i] = a[i + 1] = a[i + 2] = Math.max(0, Math.min(255, v + 40)); } g.putImageData(d, 0, 0);
    const nt = new T.CanvasTexture(c); nt.encoding = T.sRGBEncoding; nt.wrapS = t.wrapS; nt.wrapT = t.wrapT; nt.flipY = t.flipY; nt.repeat.copy(t.repeat); nt.offset.copy(t.offset); greyCache.set(t, nt); return nt; }
  const H = {}; // altura de cada camada, medida no próprio modelo
  const measure = (name) => { const c = piece(name); const b = new T.Box3().setFromObject(c); return b; };
  const cidadeG = new T.Group(), matCache = {};
  // o que passa de ~300 m some na névoa: não vale desenhar (as malhas juntadas e os pedaços instanciados entram aqui)
  const longe = [], LONGE = 300, cv = new T.Vector3();
  function cortaLonge() { for (const o of longe) { const s = o.geometry.boundingSphere; if (!s) continue; cv.copy(s.center).applyMatrix4(o.matrixWorld); o.visible = cv.distanceTo(camera.position) - s.radius < (o.userData.longe || LONGE) * (leve ? 0.7 : 1); } }
  function building(x0, z0, side, bays, floors, kinds) {
    const g = new T.Group(); g.position.set(x0, 0.12, z0); g.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; cidadeG.add(g);
    const tint = new T.Color(kinds.tint || "#ffffff");
    const retint = (o) => o.traverse((m) => { if (!m.isMesh) return; const n = m.material.name || "";
      if (/plaster/.test(n)) { const k = "p" + tint.getHexString(); if (!matCache[k]) { matCache[k] = m.material.clone(); matCache[k].map = greyMap(m.material.map); matCache[k].color.copy(tint); } m.material = matCache[k]; }
      else if (/glass/.test(n)) { const lit = rnd() < (kinds.lit == null ? 0.45 : kinds.lit) ? 1 + Math.floor(rnd() * 4) : 0, k = "g" + lit + n;
        if (!matCache[k]) { const gm = (matCache[k] = m.material.clone()); if (lit) { gm.emissive = new T.Color(["#ffcf8a", "#ffe2b0", "#fff0d8", "#cfe4ff"][lit - 1]); gm.emissiveIntensity = 0.75; } } m.material = matCache[k]; } });
    const BW = 3, FH = H.wall;
    for (let i = 0; i < bays; i++) {
      const x = (i + 1) * BW;
      const add = (name, y) => { const p = piece(name); retint(p); p.position.set(x, y, 0); g.add(p); return p; };
      add("base_standard_01", 0);
      let y = H.base;
      // térreo
      const gk = kinds.ground[i % kinds.ground.length];
      if (gk === "porta") { add("dado_door_centered_large_01", y); add("wall_door_centered_large_01", y); add("door_centered_large_01", y); }
      else if (gk === "loja") { add("dado_door_centered_large_01", y); add("wall_door_centered_large_01", y); const sh = SH && SH.clone(true); if (sh) { sh.position.set(x - 1.5, y, 0.05); sh.scale.set(1.9, 1.17, 1); g.add(sh); } }
      else { add("dado_standard_standard_01", y); add("wall_window_centered_large_01", y + H.dado); add("window_centered_large_01", y + H.dado); }
      y += gk === "porta" ? FH : H.dado + FH;
      for (let f = 1; f < floors; f++) { const wk = kinds.win[(i + f) % kinds.win.length]; add("wall_window_" + wk + "_01", y); add("window_" + wk + "_01", y);
        if (kinds.balc && (i + f) % 2 === kinds.balc - 1) balcony(g, x - BW / 2, y, tint);
        else if (rnd() < 0.3) { const a = acUnit(); a.position.set(x - BW + 0.55, y + 0.35, 0.38); a.userData.bracket = true; g.add(a); bracket(g, x - BW + 0.55, y + 0.35); }
        y += FH; }
      add("cornice_standard_standard_01", y);
    }
    for (let i = 0; i <= bays; i++) { const x = i * BW; let y = H.base; for (let f = 0; f < floors; f++) { const p = piece("wall_pier_standard_01"); retint(p); p.position.set(x, y, 0); g.add(p); y += FH; } }
    // o corpo do prédio atrás da fachada (para não ver o vazio de lado)
    const top = H.base + H.dado + FH * floors + 0.3, body = new T.Mesh(new T.BoxGeometry(bays * BW, top, 9), bodyMat(tint));
    body.position.set(bays * BW / 2, top / 2, -4.75); g.add(body);
    roof(g, bays * BW, top);
    g.userData = { bays, floors, top, BW };
    shadowOn(g); return g;
  }
  // as laterais e o fundo do prédio: concreto de verdade, um tom abaixo da fachada
  const bodyMats = new Map();
  const bodyMat = (tint) => { const k = tint.getHexString(); if (!bodyMats.has(k)) bodyMats.set(k, pbr("concrete", [3, 3], { color: tint.clone().multiplyScalar(0.62), metalness: 0 })); return bodyMats.get(k); };
  // varanda: laje fina, guarda-corpo de barras de alumínio e, às vezes, o ar-condicionado e roupa no varal
  const railTex = canvasTex(256, 128, (c, W, Hh) => { c.clearRect(0, 0, W, Hh); c.fillStyle = "#fff"; c.fillRect(0, 0, W, 10); c.fillRect(0, Hh - 8, W, 8); for (let x = 4; x < W; x += 12) c.fillRect(x, 0, 4, Hh); });
  railTex.wrapS = T.RepeatWrapping; railTex.repeat.set(3, 1);
  const railMat = new T.MeshStandardMaterial({ color: "#9a9ca0", map: railTex, alphaTest: 0.5, side: T.DoubleSide, metalness: 0.6, roughness: 0.45 });
  const slabMat = new T.MeshStandardMaterial({ color: "#8e8a84", roughness: 0.9 });
  function balcony(g, cx, y, tint) {
    const D = 0.95, W = 2.9;
    const slab = new T.Mesh(new T.BoxGeometry(W, 0.14, D), bodyMat(tint)); slab.position.set(cx, y + 0.02, D / 2 + 0.1); g.add(slab);
    const front = new T.Mesh(new T.PlaneGeometry(W, 1.0), railMat); front.position.set(cx, y + 0.6, D + 0.08); g.add(front);
    for (const s of [-1, 1]) { const side = new T.Mesh(new T.PlaneGeometry(D, 1.0), railMat); side.rotation.y = Math.PI / 2; side.position.set(cx + s * (W / 2 - 0.02), y + 0.6, D / 2 + 0.1); g.add(side); }
    const capM = new T.MeshStandardMaterial({ color: "#7a7c80", metalness: 0.7, roughness: 0.4 }); const cap = new T.Mesh(new T.BoxGeometry(W, 0.05, 0.06), capM); cap.position.set(cx, y + 1.12, D + 0.08); g.add(cap);
    if (rnd() < 0.65) { const a = acUnit(); a.position.set(cx + (rnd() < 0.5 ? -1 : 1) * 0.85, y + 0.37, 0.45); g.add(a); }
    if (rnd() < 0.45) laundry(g, cx, y + 1.85, D - 0.15);
  }
  // unidade externa do ar-condicionado: caixa clara com a grade do ventilador
  const acTex = canvasTex(256, 192, (c, W, Hh) => { c.fillStyle = "#e4e2dc"; c.fillRect(0, 0, W, Hh); c.fillStyle = "#3a3c40"; c.beginPath(); c.arc(W * 0.38, Hh / 2, Hh * 0.38, 0, 7); c.fill(); c.strokeStyle = "#cfcdc6"; c.lineWidth = 3; for (let r = 10; r < Hh * 0.38; r += 9) { c.beginPath(); c.arc(W * 0.38, Hh / 2, r, 0, 7); c.stroke(); } c.beginPath(); c.moveTo(W * 0.38 - Hh * 0.38, Hh / 2); c.lineTo(W * 0.38 + Hh * 0.38, Hh / 2); c.stroke(); c.fillStyle = "#c8c6be"; for (let y = 20; y < Hh - 20; y += 10) c.fillRect(W * 0.76, y, W * 0.18, 4); });
  const acSide = new T.MeshStandardMaterial({ color: "#d8d6d0", roughness: 0.6 }), acFront = new T.MeshStandardMaterial({ map: acTex, roughness: 0.6 });
  function acUnit() { const g = new T.Group(); const b = new T.Mesh(new T.BoxGeometry(0.8, 0.56, 0.28), [acSide, acSide, acSide, acSide, acFront, acSide]); g.add(b); const pipe = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.5, 6), new T.MeshStandardMaterial({ color: "#efece4", roughness: 0.7 })); pipe.position.set(0.43, 0.1, -0.1); g.add(pipe); return g; }
  function bracket(g, x, y) { const m = new T.MeshStandardMaterial({ color: "#5a5c60", metalness: 0.6, roughness: 0.5 }); for (const s of [-0.3, 0.3]) { const b = new T.Mesh(new T.BoxGeometry(0.04, 0.04, 0.4), m); b.position.set(x + s, y - 0.3, 0.32); g.add(b); } }
  // roupa no varal da varanda
  const clothCols = ["#f2f0ea", "#c8d4e4", "#e8c8b8", "#4a5a7a", "#f0e2a8", "#d8d8d8", "#9a3a3a"];
  const roupaMats = {}; const roupaMat = (c) => roupaMats[c] || (roupaMats[c] = new T.MeshStandardMaterial({ color: c, side: T.DoubleSide, roughness: 0.95 }));
  function laundry(g, cx, y, z) {
    const pole = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, 2.6, 6), new T.MeshStandardMaterial({ color: "#b8bcc2", metalness: 0.6, roughness: 0.4 })); pole.rotation.z = Math.PI / 2; pole.position.set(cx, y, z); g.add(pole);
    let x = cx - 1.1; while (x < cx + 1.0) { const w = 0.3 + rnd() * 0.4, h = 0.4 + rnd() * 0.5; const c = new T.Mesh(new T.PlaneGeometry(w, h), roupaMat(clothCols[Math.floor(rnd() * clothCols.length)])); c.position.set(x + w / 2, y - h / 2 - 0.02, z); c.rotation.y = (rnd() - 0.5) * 0.3; c.rotation.x = (rnd() - 0.5) * 0.12; g.add(c); x += w + 0.08 + rnd() * 0.2; }
  }
  // telhado: mureta, caixa d'água e ar-condicionados
  const tankMat = new T.MeshStandardMaterial({ color: "#c8c4b8", roughness: 0.7, metalness: 0.2 });
  function roof(g, W, top) {
    if (rnd() < 0.5) { const t = new T.Group(); const c = new T.Mesh(new T.CylinderGeometry(0.7, 0.7, 1.4, 20), tankMat); c.position.y = 0.7 + 0.5; t.add(c); for (const [a, b] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) { const l = new T.Mesh(new T.BoxGeometry(0.06, 0.5, 0.06), tankMat); l.position.set(a, 0.25, b); t.add(l); } t.position.set(W * (0.3 + rnd() * 0.4), top, -3 - rnd() * 3); g.add(t); }
    const n = Math.floor(rnd() * 3); for (let k = 0; k < n; k++) { const a = acUnit(); a.position.set(0.8 + rnd() * (W - 1.6), top + 0.28, -1.2 - rnd() * 5); a.rotation.y = rnd() < 0.5 ? 0 : Math.PI; g.add(a); }
  }
  const WALL_X = RW / 2 + SW; // fachadas encostadas na calçada
  let SH = null;
  // placas: vertical (tate-kanban) presa na fachada, e a de cima da porta
  function canvasTex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t; }
  const JP = "'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif", JPS = "'Hiragino Sans', 'Noto Sans JP', sans-serif";
  function vsign(text, bg, fg, w, h) {
    const tex = canvasTex(128, 128 * h / w, (g, W, Hh) => { g.fillStyle = bg; g.fillRect(0, 0, W, Hh); g.strokeStyle = fg; g.globalAlpha = 0.35; g.lineWidth = 4; g.strokeRect(6, 6, W - 12, Hh - 12); g.globalAlpha = 1;
      g.fillStyle = fg; const n = [...text].length, fs = Math.min(W * 0.72, (Hh - 30) / n * 0.92); g.font = `700 ${fs}px ${JPS}`; g.textAlign = "center"; g.textBaseline = "middle"; [...text].forEach((ch, i) => g.fillText(ch, W / 2, 15 + (i + 0.5) * (Hh - 30) / n)); });
    const m = new T.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new T.Color("#ffffff"), emissiveIntensity: 0.55, roughness: 0.4 });
    const fr = new T.MeshStandardMaterial({ color: "#2a2a2e", roughness: 0.5, metalness: 0.4 });
    const box = new T.Mesh(new T.BoxGeometry(w, h, 0.14), [fr, fr, fr, fr, m, m]); return box;
  }
  function hsign(text, bg, fg, w, h) {
    const tex = canvasTex(512, 512 * h / w, (g, W, Hh) => { g.fillStyle = bg; g.fillRect(0, 0, W, Hh); g.fillStyle = fg; g.font = `700 ${Hh * 0.62}px ${JPS}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, W / 2, Hh / 2 + 2, W * 0.92); });
    return new T.Mesh(new T.BoxGeometry(w, h, 0.1), [0, 0, 0, 0, 1, 0].map((k) => k ? new T.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new T.Color("#ffffff"), emissiveIntensity: 0.4, roughness: 0.5 }) : new T.MeshStandardMaterial({ color: "#222226" })));
  }
  // noren: a cortina curta de pano na porta, em três folhas que balançam
  const norens = [];
  function noren(text, col, w) {
    const g = new T.Group(); const tex = canvasTex(512, 256, (c, W, Hh) => { c.fillStyle = col; c.fillRect(0, 0, W, Hh); c.fillStyle = "#f4efe4"; c.font = `700 120px ${JP}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, W / 2, Hh / 2 + 8); });
    for (let k = 0; k < 3; k++) { const geo = new T.PlaneGeometry(w / 3 - 0.02, 0.62, 2, 6); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (k + uv.getX(i)) / 3); const m = new T.Mesh(geo, new T.MeshStandardMaterial({ map: tex, side: T.DoubleSide, roughness: 0.9 })); m.position.set(-w / 2 + (k + 0.5) * w / 3, -0.31, 0); g.add(m); norens.push({ m, ph: rnd() * 6 }); }
    const rod = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, w + 0.2, 8), new T.MeshStandardMaterial({ color: "#6a4a2a" })); rod.rotation.z = Math.PI / 2; g.add(rod); return g;
  }
  // lanterna de papel vermelha (chōchin), acesa por dentro
  const chochinMats = {}, chochinTampa = new T.MeshStandardMaterial({ color: "#151212" });
  function chochin(text) {
    if (!chochinMats[text]) { const tex = canvasTex(256, 256, (c, W, Hh) => { c.fillStyle = "#c8281e"; c.fillRect(0, 0, W, Hh); c.fillStyle = "#1a1210"; c.font = `700 92px ${JP}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, W / 2, Hh / 2 + 4); c.strokeStyle = "rgba(0,0,0,0.25)"; for (let y = 10; y < Hh; y += 18) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); } });
      chochinMats[text] = new T.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new T.Color("#ffb070"), emissiveIntensity: 1.3, roughness: 0.8 }); }
    const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new T.Vector2(0.2 * Math.sin(Math.PI * (0.08 + t * 0.84)) + 0.02, -0.28 + t * 0.56)); }
    const g = new T.Group(); const body = new T.Mesh(new T.LatheGeometry(pts, 20), chochinMats[text]); g.add(body);
    for (const y of [-0.29, 0.29]) { const c = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 0.05, 12), chochinTampa); c.position.y = y; g.add(c); }
    const l = new T.PointLight("#ff9a5a", 0.8, 5, 2); g.add(l); return g;
  }
  // máquina de bebidas: caixa com a frente iluminada, fileiras de latas e botões
  function vending(col) {
    const g = new T.Group(); const tex = canvasTex(256, 512, (c, W, Hh) => { c.fillStyle = "#f4f6f8"; c.fillRect(0, 0, W, Hh); c.fillStyle = col; c.fillRect(0, 0, W, 46); c.fillStyle = "#fff"; c.font = `700 30px ${JPS}`; c.textAlign = "center"; c.fillText("つめた〜い", W / 2, 32);
      const cols = ["#d8332a", "#2a6ad8", "#f2c230", "#3aa85a", "#8a5a3a", "#e8e8e8", "#1a1a1a", "#e87a2a"];
      for (let r = 0; r < 4; r++) { c.fillStyle = "#dfe6ea"; c.fillRect(10, 60 + r * 74, W - 20, 64); for (let k = 0; k < 6; k++) { c.fillStyle = cols[(r * 3 + k) % cols.length]; c.fillRect(18 + k * 38, 66 + r * 74, 26, 44); c.fillStyle = "#fff"; c.fillRect(22 + k * 38, 72 + r * 74, 18, 6); c.fillStyle = r < 2 ? "#2a7ad8" : "#d83a2a"; c.fillRect(20 + k * 38, 114 + r * 74, 22, 6); } }
      c.fillStyle = "#2a2e34"; c.fillRect(20, 370, W - 40, 110); c.fillStyle = "#101214"; c.fillRect(40, 440, W - 80, 30); c.fillStyle = "#3aff7a"; c.font = "600 22px monospace"; c.fillText("¥130", W / 2, 400); });
    const front = new T.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new T.Color("#ffffff"), emissiveIntensity: 0.45, roughness: 0.3 }), shell = new T.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.2 });
    const box = new T.Mesh(new T.BoxGeometry(1.0, 1.83, 0.75), [shell, shell, shell, shell, front, shell]); box.position.y = 0.915; g.add(box);
    const glow = new T.PointLight("#e8f4ff", 0.7, 3.5, 2); glow.position.set(0, 1.1, 0.8); g.add(glow); shadowOn(g); return g;
  }

  /* ---------------- a rua montada ---------------- */
  const TINTS = ["#f2ede2", "#e8e2d6", "#d8dcd8", "#ece4d2", "#cfd2d6", "#e6d8c6", "#f4f0e8", "#d6cfc4"];
  const WINS = ["centered_large", "centered_double", "centered_small", "offset_small"];
  // as lojas que guardam o portfólio: cada placa é uma matéria (em japonês), a cafeteria é o "Quem sou"
  const SHOPS = [["喫茶", "#2a3a5a", "#f4efe4", "珈琲", "perfil"], ["理科", "#2a6a46", "#ffffff", "理", "natureza"], ["社会", "#5a3a22", "#f4e8d0", "史", "humanas"], ["国語", "#f4efe4", "#1a1a1a", "文", "linguagens"], ["数学", "#2a4a8a", "#ffffff", "数", "matematica"],
    ["設計", "#1a1a1a", "#ffd27a", "図", "modelagem"], ["開発", "#c8281e", "#fff4e0", "技", "desenvolvimento"], ["アプリ", "#f2c230", "#1a1a1a", "携", "programacao-aplicativos"], ["電子", "#3a2a6a", "#ece4ff", "電", "iot"], ["データ", "#f4efe4", "#c8281e", "庫", "banco"]];
  const EXTRA = [["らーめん", "#c8281e", "#fff4e0", "麺"], ["居酒屋", "#1a1a1a", "#ffd27a", "酒"], ["銭湯", "#2a4a8a", "#ffffff", "湯"], ["定食", "#f2c230", "#1a1a1a", "食"], ["美容室", "#f4efe4", "#c8281e", "髪"], ["たばこ", "#d8332a", "#ffffff", "煙"]];
  const lojas = []; // placas clicáveis
  const buildings = [];
  function street() {
    // primeiro sorteia os lotes dos dois lados; as matérias ficam nos lotes mais perto do começo da rua, alternando os lados
    const lotes = [];
    for (const side of [-1, 1]) {
      let z = side < 0 ? 24 : 22;
      while (z > -60) {
        const bays = 2 + Math.floor(rnd() * 3), floors = 2 + Math.floor(rnd() * 3), w = bays * 3;
        const ground = Array.from({ length: bays }, (_, i) => (i === 0 ? (rnd() < 0.5 ? "loja" : "porta") : rnd() < 0.35 ? "porta" : rnd() < 0.25 ? "loja" : "janela"));
        lotes.push({ side, z, w, bays, floors, ground, kinds: { ground, win: WINS.slice(Math.floor(rnd() * 3)), tint: TINTS[Math.floor(rnd() * TINTS.length)], lit: 0.5, balc: rnd() < 0.6 ? 1 + Math.floor(rnd() * 2) : 0 } });
        z -= w + (rnd() < 0.35 ? 1.2 + rnd() * 1.2 : 0); // às vezes um beco entre um prédio e outro
      }
    }
    [...lotes].sort((a, b) => b.z - a.z).forEach((l, i) => { l.shop = i < SHOPS.length ? SHOPS[i] : EXTRA[(i - SHOPS.length) % EXTRA.length]; });
    for (const { side, z, w, bays, floors, kinds, shop } of lotes) {
        const zStart = side < 0 ? z : z - w; // lado esquerdo: o kit cresce para -z; lado direito: para +z
        const b = building(side * WALL_X, zStart, side, bays, floors, kinds);
        buildings.push({ b, side, z0: z, z1: z - w, shop, bays, floors });
        // a placa vertical na quina, acesa
        const vs = vsign(shop[0], shop[1], shop[2], 0.55, Math.min(2.6, 0.75 * [...shop[0]].length + 0.4)); vs.position.set(side * (WALL_X - 0.42), 0.12 + H.base + H.dado + 3 + 1.5, z - 0.4); cidadeG.add(vs); shadowOn(vs);
        // a placa de cima da porta
        const hs = hsign(shop[0], shop[1], shop[2], 2.6, 0.5); hs.position.set(side * (WALL_X - 0.12), 0.12 + H.base + H.dado + 2.62, z - 1.5); hs.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; cidadeG.add(hs);
        if (shop[4]) lojas.push({ id: shop[4], kanji: shop[0], cor: shop[1], alvos: [vs, hs], porta: V3(side * (WALL_X - 0.2), 1.6, z - 1.5), side });
        // noren na porta, e lanternas vermelhas em alguns
        if (shop[4] || rnd() < 0.7) { const n = noren(shop[3], shop[1] === "#f4efe4" ? "#2a3a5a" : shop[1], 1.7); n.position.set(side * (WALL_X - 0.2), 0.12 + H.base + H.dado + 2.25, z - 1.5); n.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(n); if (shop[4]) lojas[lojas.length - 1].alvos.push(...n.children); }
        if (rnd() < 0.5) for (const dz of [-0.2, -2.8]) { const l = chochin(shop[3]); l.position.set(side * (WALL_X - 0.35), 0.12 + H.base + H.dado + 2.1, z + dz); l.rotation.z = (rnd() - 0.5) * 0.06; cidadeG.add(l); }
    }
    // duas máquinas de bebida lado a lado, perto da câmera
    for (const [dz, col] of [[0, "#d8332a"], [-1.05, "#2a6ad8"]]) { const v = vending(col); v.position.set(-(WALL_X - 0.5), 0.12, 14.6 + dz); v.rotation.y = Math.PI / 2; cidadeG.add(v); }
  }

  /* postes com fiação, luminárias e as miudezas da calçada */
  function props(M) {
    const poleZ = []; for (let z = 22; z > -60; z -= 13) poleZ.push(z);
    let preset = null;
    if (M.poles) { const grp = new T.Group(); const kids = [...M.poles.children]; for (const c of kids) if (/^preset_01_/.test(c.name)) grp.add(c.clone(true)); if (!grp.children.length) for (const c of kids) if (/^preset_0\d_/.test(c.name)) grp.add(c.clone(true)); const b = new T.Box3().setFromObject(grp), cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2; grp.children.forEach((c) => { c.position.x -= cx; c.position.z -= cz; }); preset = { grp, top: b.max.y }; }
    const tops = { "-1": [], "1": [] };
    for (const side of [-1, 1]) poleZ.forEach((z, i) => {
      const zz = z - (side > 0 ? 6 : 0); const x = side * (RW / 2 + 0.35);
      if (preset) { const p = preset.grp.clone(true); p.position.set(x, 0.12, zz); p.rotation.y = side < 0 ? 0 : Math.PI; cidadeG.add(p); shadowOn(p); tops[side].push(V3(x, preset.top - 0.4, zz)); }
      if (M.lamp && i % 2 === 0) { const l = M.lamp.clone(true); const b = new T.Box3().setFromObject(l), k = 0.55 / (b.max.y - b.min.y); l.scale.setScalar(k); l.position.set(x - side * 0.3, 4.3, zz); l.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; l.traverse((o) => { if (o.isMesh && /glass|bulb/i.test(o.material.name || "")) { const k = "luz" + o.material.uuid; if (!matCache[k]) { matCache[k] = o.material.clone(); matCache[k].emissive = new T.Color("#fff2d8"); matCache[k].emissiveIntensity = 1.5; } o.material = matCache[k]; } }); cidadeG.add(l); const pl = new T.SpotLight("#ffe8c8", 3.5, 14, 0.9, 0.6, 1.5); pl.position.set(x - side * 0.45, 4.15, zz); pl.target.position.set(x - side * 2.2, 0, zz); scene.add(pl, pl.target); }
    });
    // fios: vários por vão, com barriga, de poste em poste e atravessando a rua
    const wm = new T.MeshStandardMaterial({ color: "#16161a", roughness: 0.6 });
    const span = (a, b, sag, r) => { const pts = []; for (let k = 0; k <= 14; k++) { const t = k / 14; pts.push(a.clone().lerp(b, t).add(V3(0, -Math.sin(t * Math.PI) * sag, 0))); } const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 20, r, 4), wm); m.castShadow = true; cidadeG.add(m); };
    for (const side of [-1, 1]) { const t = tops[side]; for (let i = 0; i < t.length - 1; i++) for (let k = 0; k < 6; k++) { const off = V3(0, -k * 0.28 - (k > 2 ? 0.5 : 0), ((k % 3) - 1) * 0.35); span(t[i].clone().add(off), t[i + 1].clone().add(off), 0.35 + rnd() * 0.5, k > 2 ? 0.018 : 0.011); } }
    for (let i = 0; i < Math.min(tops["-1"].length, tops["1"].length); i += 2) { span(tops["-1"][i].clone().add(V3(0, -0.9, 0)), tops["1"][i].clone().add(V3(0, -0.9, 6)), 0.6, 0.012); span(tops["-1"][i].clone().add(V3(0, -1.3, 0)), tops["1"][i].clone().add(V3(0, -1.2, 6)), 0.8, 0.012); }
    // fios até as fachadas
    for (const B of buildings) if (rnd() < 0.6) { const t = tops[B.side]; if (!t.length) continue; const near = t.reduce((a, b) => (Math.abs(b.z - B.z0) < Math.abs(a.z - B.z0) ? b : a)); span(near.clone().add(V3(0, -1.1, 0)), V3(B.side * (WALL_X - 0.1), 0.12 + H.base + H.dado + 3 * Math.min(2, B.floors) - 0.4, B.z0 - 1.2), 0.3, 0.01); }
    // miudezas: caixas de luz, lixeiras, vasos, engradados, tampas de bueiro
    const place = (m, x, z, ry = 0, s = 1) => { if (!m) return; const o = m.clone(true); o.position.set(x, 0.12, z); o.rotation.y = ry; o.scale.setScalar(s); cidadeG.add(o); shadowOn(o); return o; };
    for (const B of buildings) {
      const x = B.side * (WALL_X - 0.45), r = B.side < 0 ? Math.PI / 2 : -Math.PI / 2;
      if (rnd() < 0.55) place(rnd() < 0.5 ? M.pot1 : M.pot2, x, B.z0 - 0.3 - rnd() * 0.4, rnd() * 6, 0.8);
      if (rnd() < 0.45) place(M.pot3, x - B.side * 0.05, B.z0 - 2.9, 0, 1.2);
      if (rnd() < 0.3) place(M.planter, x, B.z1 + 1.2, r);
      if (rnd() < 0.35) { place(M.crate, x, B.z1 + 0.6, rnd()); if (rnd() < 0.6) { const c = place(M.crate, x, B.z1 + 0.6, rnd()); if (c) c.position.y += 0.3; } }
      if (rnd() < 0.3) place(rnd() < 0.5 ? M.ubox1 : M.ubox2, B.side * (WALL_X - 0.3), B.z1 + 2.2, r);
      if (rnd() < 0.25) place(M.trash, x, B.z1 + 1.6, rnd());
    }
    for (let z = 18; z > -55; z -= 11) { const m = place(M.man, 0.6 * (rnd() < 0.5 ? -1 : 1), z, rnd() * 6); if (m) m.position.y = 0.002; }
  }

  /* ---------------- o resto do mundo (outros arquivos) usa estas peças ---------------- */
  const ticks = [];
  const M = window.MUNDO = Object.assign(window.MUNDO || {}, { leve, peso, T, scene, renderer, camera, sun, V3, rnd, load, pbr, tx, canvasTex, shadowOn, texL, Q, ticks, JP, JPS, chochin, norens, lojas, juntar, longe, lerF });

  /* ---------------- câmera ---------------- */
  camera.position.set(0.6, 1.65, 26); camera.lookAt(-0.4, 3.2, -10); // até o passeio assumir
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 66 : 48; camera.updateProjectionMatrix(); }
  addEventListener("resize", resize); resize();

  /* ---------------- carregar e montar ---------------- */
  (async () => {
    KIT = await load("modular_urban_apartments_facade");
    if (KIT) {
      H.base = measure("base_standard_01").max.y; H.dado = measure("dado_standard_standard_01").max.y; H.wall = measure("wall_pier_standard_01").max.y; H.cornice = measure("cornice_standard_standard_01").max.y;
    }
    SH = await load("rollershutter_door"); if (SH) { const gr = SH.getObjectByName("rollershutter_door_graffiti"); if (gr) gr.parent.remove(gr); }
    if (KIT) street();
    const [poles, lamp0, ubox1, ubox2, trash, crate, pot1, pot2, planter, man, pot3] = await Promise.all(["modular_electricity_poles", "security_light", "utility_box_01", "utility_box_02", "metal_trash_can", "plastic_crate_01", "potted_plant_01", "potted_plant_02", "planter_box_01", "water_manhole_cover", "planter_pot_clay"].map(load));
    props({ poles, lamp: lamp0, ubox1, ubox2, trash, crate, pot1, pot2, planter, man, pot3 });
    scene.add(cidadeG); juntar(cidadeG, 48);
    for (const b of M.builders || []) { try { await b(M); } catch (e) { console.error("mundo:", e); } }
    window.cidadePronta = true;
  })();

  const clock = new T.Clock();
  function frame() {
    const t = clock.getElapsedTime();
    if (M.camTick) M.camTick(t);
    cortaLonge();
    for (const f of ticks) f(t);
    for (const n of norens) n.m.rotation.x = Math.sin(t * 1.3 + n.ph) * 0.06 * (n.k || 1);
    // ?pausa=1: não desenha enquanto carrega (para testes num computador sem placa de vídeo)
    if (!(Q.has("pausa") && !window.cidadePronta)) renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
})();
