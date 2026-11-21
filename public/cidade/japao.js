/* Construções japonesas feitas com texturas de verdade: torii, lanterna de pedra (tōrō), santuário (haiden),
   corda sagrada (shimenawa) e a casa de fazenda (minka). Cada função devolve um THREE.Group pronto. */
(() => {
  const M = (window.MUNDO = window.MUNDO || {});
  M.japao = (M) => {
    const { T, pbr, tx, canvasTex, shadowOn, JP } = M;
    const mats = {};
    const mat = (k, f) => mats[k] || (mats[k] = f());
    // vermelhão laqueado: a cor sólida com o relevo e a aspereza da madeira de cedro por baixo
    const VERM = () => mat("verm", () => new T.MeshStandardMaterial({ color: "#b5301b", roughness: 0.55, normalMap: tx("japanese_cedar_planks", "nor", [1, 2]), normalScale: new T.Vector2(0.5, 0.5) }));
    const PRETO = () => mat("preto", () => new T.MeshStandardMaterial({ color: "#191514", roughness: 0.38 }));
    const PEDRA = () => mat("pedra", () => pbr("mossy_rock", [1, 1], { color: "#b8b4a8", metalness: 0 }));
    const HINOKI = () => mat("hinoki", () => pbr("hinoki_planks", [1, 1], { metalness: 0 }));
    const MADEIRA_ESC = () => mat("madesc", () => pbr("japanese_cedar_planks", [1, 1], { color: "#6a5a4a", metalness: 0 }));
    const TELHA = () => mat("telha", () => pbr("grey_roof_tiles", [6, 3], { metalness: 0, side: T.DoubleSide }));
    const PALHA = () => mat("palha", () => pbr("thatch_roof_angled", [4, 2], { metalness: 0, side: T.DoubleSide, color: "#d8c8a8" }));
    const REBOCO = () => mat("reboco", () => new T.MeshStandardMaterial({ color: "#ece6d8", roughness: 0.92 }));
    const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
    const cyl = (r1, r2, h, m, seg = 20) => new T.Mesh(new T.CylinderGeometry(r1, r2, h, seg), m);
    // viga com as pontas levantadas (o kasagi do torii, a cumeeira do telhado)
    function curvedBeam(L, th, d, lift, m) {
      const g = new T.BoxGeometry(L, th, d, 48, 1, 1), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const u = Math.abs(p.getX(i)) / (L / 2); p.setY(i, p.getY(i) + lift * Math.pow(u, 2.6) + (p.getY(i) > 0 ? th * 0.25 * Math.pow(u, 2) : 0)); }
      g.computeVertexNormals(); return new T.Mesh(g, m);
    }

    /* torii no estilo myōjin: dois pilares levemente inclinados, a viga de baixo (nuki) que atravessa os pilares,
       o escorinho do meio (gakuzuka) com a placa, e a viga de cima curva (shimaki + kasagi com capa preta) */
    function torii(W = 4, H = 5, opt = {}) {
      const g = new T.Group(), r = opt.r || W * 0.045, V = VERM(), P = PRETO();
      const lean = 0.025;
      for (const s of [-1, 1]) {
        const p = cyl(r * 0.88, r, H, V, 24); p.position.set(s * W / 2, H / 2, 0); p.rotation.z = s * lean; g.add(p);
        const sleeve = cyl(r * 1.12, r * 1.16, H * 0.09, P, 24); sleeve.position.set(s * W / 2 + s * Math.sin(lean) * 0, H * 0.045, 0); g.add(sleeve);
        if (!opt.noBase) { const b = cyl(r * 1.55, r * 1.8, 0.22, PEDRA(), 24); b.position.set(s * W / 2, 0.06, 0); g.add(b); }
      }
      const nukiY = H * 0.74, topY = H * 0.93;
      g.add(box(W + r * 5.5, r * 0.95, r * 0.7, V, 0, nukiY, 0));
      g.add(box(r * 0.95, topY - nukiY, r * 0.55, V, 0, (nukiY + topY) / 2, 0));
      const shimaki = curvedBeam(W + r * 9, r * 0.9, r * 1.15, H * 0.02, V); shimaki.position.y = topY + r * 0.2; g.add(shimaki);
      const kasagi = curvedBeam(W + r * 11, r * 0.75, r * 1.35, H * 0.055, V); kasagi.position.y = topY + r * 1.0; g.add(kasagi);
      const cap = curvedBeam(W + r * 11.3, r * 0.32, r * 1.45, H * 0.055, P); cap.position.y = topY + r * 1.52; g.add(cap);
      if (opt.placa) {
        const t = canvasTex(128, 256, (c, w, h) => { c.fillStyle = "#1a1514"; c.fillRect(0, 0, w, h); c.strokeStyle = "#c9a24a"; c.lineWidth = 6; c.strokeRect(8, 8, w - 16, h - 16); c.fillStyle = "#e0b85a"; const ch = [...opt.placa]; c.font = `700 ${Math.min(80, (h - 40) / ch.length)}px ${JP}`; c.textAlign = "center"; c.textBaseline = "middle"; ch.forEach((k, i) => c.fillText(k, w / 2, 20 + (i + 0.5) * (h - 40) / ch.length)); });
        const pm = new T.MeshStandardMaterial({ map: t, roughness: 0.4, emissiveMap: t, emissive: new T.Color("#ffd28a"), emissiveIntensity: 0.15 });
        const pl = new T.Mesh(new T.BoxGeometry(r * 2.2, (topY - nukiY) * 0.8, r * 0.3), [P, P, P, P, pm, pm]); pl.position.set(0, (nukiY + topY) / 2, r * 0.42); g.add(pl);
      }
      shadowOn(g); return g;
    }

    /* lanterna de pedra kasuga: base, haste, plataforma, caixa de fogo com janelas acesas, telhado hexagonal e a joia no topo */
    const fireTex = canvasTex(384, 128, (c, w, h) => { c.fillStyle = "#000"; c.fillRect(0, 0, w, h); for (let k = 0; k < 6; k++) { if (k % 2) continue; const x = k * w / 6; c.fillStyle = "#ffcc80"; c.fillRect(x + 14, 22, w / 6 - 28, h - 44); } });
    const lightGlass = new T.MeshStandardMaterial({ color: "#2a2622", roughness: 0.9, emissive: new T.Color("#ffb060"), emissiveMap: fireTex, emissiveIntensity: 0 });
    M.toroLuz = lightGlass; // a magia acende as lanternas
    function toro(s = 1) {
      const g = new T.Group(), P = PEDRA();
      const add = (o, y) => { o.position.y = y; g.add(o); return o; };
      add(cyl(0.44, 0.5, 0.18, P, 6), 0.09);
      add(cyl(0.3, 0.4, 0.16, P, 6), 0.26);
      add(cyl(0.12, 0.14, 0.78, P, 16), 0.73);
      add(cyl(0.135, 0.135, 0.05, P, 16), 0.6); add(cyl(0.135, 0.135, 0.05, P, 16), 0.9);
      add(cyl(0.36, 0.2, 0.2, P, 6), 1.22);
      add(cyl(0.24, 0.24, 0.4, lightGlass, 6), 1.52);
      const kasa = add(cyl(0.06, 0.52, 0.3, P, 6), 1.87);
      const kp = kasa.geometry.attributes.position; for (let i = 0; i < kp.count; i++) if (kp.getY(i) < 0 && Math.hypot(kp.getX(i), kp.getZ(i)) > 0.4) kp.setY(i, kp.getY(i) + 0.07); kasa.geometry.computeVertexNormals();
      add(new T.Mesh(new T.SphereGeometry(0.09, 12, 8), P), 2.08);
      add(cyl(0.0, 0.07, 0.12, P, 12), 2.2);
      g.scale.setScalar(s); shadowOn(g); return g;
    }

    /* shimenawa: a corda grossa de palha com as tiras de papel em zigue-zague (shide) */
    const shideTex = canvasTex(64, 192, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = "#f8f6f0"; c.beginPath(); c.moveTo(8, 0); c.lineTo(40, 0); c.lineTo(40, 40); c.lineTo(56, 40); c.lineTo(56, 96); c.lineTo(40, 96); c.lineTo(40, 140); c.lineTo(56, 140); c.lineTo(56, 192); c.lineTo(24, 192); c.lineTo(24, 150); c.lineTo(8, 150); c.lineTo(8, 100); c.lineTo(24, 100); c.lineTo(24, 50); c.lineTo(8, 50); c.closePath(); c.fill(); });
    const shideMat = new T.MeshStandardMaterial({ map: shideTex, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.9 });
    const ropeTex = canvasTex(256, 64, (c, w, h) => { c.fillStyle = "#c8b07a"; c.fillRect(0, 0, w, h); c.strokeStyle = "#8a7448"; c.lineWidth = 5; for (let x = -h; x < w + h; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + h, h); c.stroke(); } });
    ropeTex.wrapS = T.RepeatWrapping;
    function shimenawa(a, b, sag, r = 0.12, shides = 5) {
      const g = new T.Group(); const pts = []; for (let k = 0; k <= 20; k++) { const t = k / 20; pts.push(a.clone().lerp(b, t).add(new T.Vector3(0, -Math.sin(t * Math.PI) * sag, 0))); }
      const curve = new T.CatmullRomCurve3(pts); const tt = ropeTex.clone(); tt.needsUpdate = true; tt.repeat.set(a.distanceTo(b) * 3, 1);
      const geo = new T.TubeGeometry(curve, 60, r, 12); const p = geo.attributes.position;
      // mais grossa no meio, como as de verdade
      for (let i = 0; i < p.count; i++) { const k = Math.floor(i / 13) / 60, f = 0.55 + 0.45 * Math.sin(k * Math.PI); const c = curve.getPoint(k); p.setXYZ(i, c.x + (p.getX(i) - c.x) * f, c.y + (p.getY(i) - c.y) * f, c.z + (p.getZ(i) - c.z) * f); }
      geo.computeVertexNormals(); g.add(new T.Mesh(geo, new T.MeshStandardMaterial({ map: tt, roughness: 0.95 })));
      for (let k = 1; k <= shides; k++) { const t = k / (shides + 1), c = curve.getPoint(t); const s = new T.Mesh(new T.PlaneGeometry(0.18, 0.54), shideMat); s.position.set(c.x, c.y - r - 0.27, c.z + 0.02); s.lookAt(s.position.clone().add(new T.Vector3(0, 0, 1)).applyAxisAngle(new T.Vector3(0, 1, 0), 0)); g.add(s); M.norens && M.norens.push({ m: s, ph: k, k: 0.6 }); }
      return g;
    }

    // a corda dando a volta num tronco (árvore sagrada), com as tiras de papel penduradas na frente
    function shimenawaAnel(c, r, shides = 5, frente = new T.Vector3(1, 0, 0)) {
      const g = new T.Group(), pts = []; const a0 = Math.atan2(frente.z, frente.x);
      for (let k = 0; k < 48; k++) { const a = (k / 48) * Math.PI * 2; const sag = 0.12 * Math.pow(Math.max(0, Math.cos(a - a0)), 2); pts.push(new T.Vector3(c.x + Math.cos(a) * r, c.y - sag, c.z + Math.sin(a) * r)); }
      const curve = new T.CatmullRomCurve3(pts, true); const tt = ropeTex.clone(); tt.needsUpdate = true; tt.repeat.set(r * 18, 1);
      g.add(new T.Mesh(new T.TubeGeometry(curve, 96, 0.11, 10, true), new T.MeshStandardMaterial({ map: tt, roughness: 0.95 })));
      for (let k = 0; k < shides; k++) { const a = a0 + (k - (shides - 1) / 2) * 0.32; const s = new T.Mesh(new T.PlaneGeometry(0.16, 0.5), shideMat); s.position.set(c.x + Math.cos(a) * (r + 0.13), c.y - 0.12 - 0.3, c.z + Math.sin(a) * (r + 0.13)); s.rotation.y = -a + Math.PI / 2; g.add(s); M.norens && M.norens.push({ m: s, ph: k, k: 0.6 }); }
      shadowOn(g); return g;
    }

    /* telhado de duas águas com a curva japonesa (sori): íngreme na cumeeira, quase plano no beiral, cantos levantados */
    function roofSurface(W, D, drop, lift, m, under) {
      const g = new T.Group();
      for (const side of [-1, 1]) {
        const geo = new T.PlaneGeometry(W, 1, 40, 16), p = geo.attributes.position, uv = geo.attributes.uv;
        for (let i = 0; i < p.count; i++) { const x = p.getX(i), u = 0.5 - p.getY(i); const ax = Math.abs(x) / (W / 2);
          const y = -drop * Math.pow(u, 0.72) + lift * Math.pow(ax, 3) * u * u, z = side * u * D;
          p.setXYZ(i, x, y, z); uv.setXY(i, uv.getX(i), side > 0 ? uv.getY(i) : 1 - uv.getY(i)); }
        geo.computeVertexNormals(); if (side < 0) { const idx = geo.index.array; for (let i = 0; i < idx.length; i += 3) { const t = idx[i]; idx[i] = idx[i + 1]; idx[i + 1] = t; } geo.computeVertexNormals(); }
        g.add(new T.Mesh(geo, m));
        if (under) { const u2 = new T.Mesh(geo.clone(), under); u2.position.y = -0.22; g.add(u2); }
      }
      return g;
    }

    /* o pavilhão do santuário (haiden), virado para +z */
    function haiden(opt = {}) {
      const g = new T.Group(), W = opt.W || 10, D = opt.D || 7, PH = 3.3, V = VERM();
      // embasamento de pedra e o assoalho de madeira
      const base = box(W + 3, 0.7, D + 3, pbr("japanese_stone_wall", [4, 0.5], { metalness: 0 }), 0, 0.35, 0); g.add(base);
      const floor = box(W + 1.2, 0.22, D + 1.2, HINOKI(), 0, 1.25, 0); g.add(floor);
      for (let x = -W / 2; x <= W / 2 + 0.01; x += W / 4) for (const z of [-D / 2, D / 2]) { const p = cyl(0.17, 0.17, PH, V, 16); p.position.set(x, 1.36 + PH / 2, z); g.add(p); }
      for (const x of [-W / 2, W / 2]) { const p = cyl(0.17, 0.17, PH, V, 16); p.position.set(x, 1.36 + PH / 2, 0); g.add(p); }
      // vigas de cima e de meia altura
      for (const z of [-D / 2, D / 2]) { g.add(box(W + 0.6, 0.32, 0.28, V, 0, 1.36 + PH - 0.2, z)); g.add(box(W + 0.4, 0.2, 0.24, V, 0, 1.36 + 0.55, z)); }
      for (const x of [-W / 2, W / 2]) g.add(box(0.28, 0.32, D + 0.6, V, x, 1.36 + PH - 0.2, 0));
      // paredes: fundo e laterais em reboco branco com rodapé de madeira
      g.add(box(W, PH - 0.5, 0.12, REBOCO(), 0, 1.36 + 0.25 + (PH - 0.5) / 2, -D / 2 + 0.05));
      for (const x of [-W / 2, W / 2]) g.add(box(0.12, PH - 0.5, D, REBOCO(), x, 1.36 + 0.25 + (PH - 0.5) / 2, 0));
      // frente: portas de treliça com luz quente atrás
      const lat = canvasTex(256, 256, (c, w, h) => { c.fillStyle = "#ffdca0"; c.fillRect(0, 0, w, h); c.fillStyle = "#3a2618"; for (let x = 0; x <= w; x += 22) c.fillRect(x - 3, 0, 6, h); for (let y = 0; y <= h; y += 22) c.fillRect(0, y - 3, w, 6); c.fillRect(0, 0, w, 10); c.fillRect(0, h - 10, w, 10); c.fillRect(0, 0, 10, h); c.fillRect(w - 10, 0, 10, h); });
      const latM = new T.MeshStandardMaterial({ map: lat, emissiveMap: lat, emissive: new T.Color("#ffb868"), emissiveIntensity: 0.55, roughness: 0.8 });
      M.haidenLuz = latM;
      for (let k = 0; k < 4; k++) { const x = -W / 2 + W / 8 + k * W / 4; const d = new T.Mesh(new T.PlaneGeometry(W / 4 - 0.4, PH - 0.95), latM); d.position.set(x, 1.36 + 0.3 + (PH - 0.95) / 2, D / 2 - 0.05); g.add(d); }
      // telhado grande de telhas cinza com beiral largo
      const ridgeY = 1.36 + PH + 3.0;
      const roof = roofSurface(W + 4.4, D / 2 + 2.3, 2.9, 0.75, TELHA(), MADEIRA_ESC()); roof.position.y = ridgeY; g.add(roof);
      const ridge = curvedBeam(W + 4.0, 0.5, 0.6, 0.35, mat("cumeeira", () => new T.MeshStandardMaterial({ color: "#4a4c50", roughness: 0.6 }))); ridge.position.y = ridgeY + 0.15; g.add(ridge);
      for (const s of [-1, 1]) { const oni = box(0.5, 0.9, 0.8, mats.cumeeira, s * (W / 2 + 2.1), ridgeY + 0.55 + 0.32, 0); g.add(oni); }
      // empenas triangulares de madeira nas laterais
      for (const s of [-1, 1]) { const sh = new T.Shape(); sh.moveTo(-D / 2 - 0.3, 0); sh.lineTo(D / 2 + 0.3, 0); sh.lineTo(0, 2.6); sh.closePath(); const gm = new T.Mesh(new T.ShapeGeometry(sh), mat("empena", () => pbr("hinoki_planks", [0.6, 0.6], { color: "#9a7a5a", metalness: 0, side: T.DoubleSide }))); gm.rotation.y = Math.PI / 2; gm.position.set(s * (W / 2 + 0.3), 1.36 + PH + 0.1, 0); g.add(gm); }
      // escada de madeira na frente
      for (let k = 0; k < 4; k++) g.add(box(3.2, 0.2, 0.4, HINOKI(), 0, 0.15 + k * 0.28, D / 2 + 1.6 + 1.3 - k * 0.38));
      // caixa de oferendas, sino e a corda
      g.add(box(1.8, 0.75, 0.8, MADEIRA_ESC(), 0, 1.36 + 0.38, D / 2 + 0.25));
      const bell = new T.Mesh(new T.SphereGeometry(0.28, 20, 14), new T.MeshStandardMaterial({ color: "#c9a24a", metalness: 0.9, roughness: 0.3 })); bell.position.set(0, 1.36 + PH - 0.55, D / 2 + 0.55); g.add(bell);
      const cord = canvasTex(32, 256, (c, w, h) => { for (let y = 0; y < h; y += 16) { c.fillStyle = (y / 16) % 3 === 0 ? "#f4efe4" : (y / 16) % 3 === 1 ? "#c8281e" : "#4a2a8a"; c.fillRect(0, y, w, 16); } });
      const rope = cyl(0.05, 0.05, 2.2, new T.MeshStandardMaterial({ map: cord, roughness: 0.9 }), 10); rope.position.set(0, 1.36 + PH - 1.75, D / 2 + 0.55); g.add(rope);
      const sm = shimenawa(new T.Vector3(-W / 2 + 0.6, 1.36 + PH - 0.45, D / 2 + 0.3), new T.Vector3(W / 2 - 0.6, 1.36 + PH - 0.45, D / 2 + 0.3), 0.55, 0.16, 6); g.add(sm);
      shadowOn(g); return g;
    }

    /* casa de fazenda (minka): madeira escura, telhado alto de palha, varanda (engawa) e janelas de papel acesas */
    function minka(opt = {}) {
      const g = new T.Group(), W = opt.W || 11, D = opt.D || 7, H = 2.8, MD = MADEIRA_ESC();
      g.add(box(W + 0.6, 0.45, D + 0.6, pbr("japanese_stone_wall", [3, 0.3], { metalness: 0 }), 0, 0.22, 0));
      for (let x = -W / 2; x <= W / 2 + 0.01; x += W / 5) for (const z of [-D / 2, D / 2]) { const p = box(0.22, H, 0.22, MD, x, 0.45 + H / 2, z); g.add(p); }
      const sho = canvasTex(256, 256, (c, w, h) => { c.fillStyle = "#ffe2b0"; c.fillRect(0, 0, w, h); c.fillStyle = "#4a3422"; for (let x = 0; x <= w; x += 42) c.fillRect(x - 3, 0, 6, h); for (let y = 0; y <= h; y += 32) c.fillRect(0, y - 2, w, 4); });
      const shoM = new T.MeshStandardMaterial({ map: sho, emissiveMap: sho, emissive: new T.Color("#ffb060"), emissiveIntensity: 0.7, roughness: 0.9 });
      M.minkaLuz = shoM;
      const wall = mat("parede-minka", () => pbr("japanese_cedar_planks", [2, 1], { color: "#7a6450", metalness: 0 }));
      for (const z of [-D / 2]) g.add(box(W, H, 0.14, wall, 0, 0.45 + H / 2, z));
      for (const x of [-W / 2, W / 2]) g.add(box(0.14, H, D, wall, x, 0.45 + H / 2, 0));
      // frente: painéis de papel acesos alternando com madeira
      for (let k = 0; k < 5; k++) { const x = -W / 2 + W / 10 + k * W / 5; const m = new T.Mesh(new T.PlaneGeometry(W / 5 - 0.3, H - 0.5), k === 2 ? wall : shoM); m.position.set(x, 0.45 + 0.2 + (H - 0.5) / 2, D / 2 - 0.02); g.add(m); }
      // varanda
      g.add(box(W + 0.4, 0.12, 1.2, HINOKI(), 0, 0.82, D / 2 + 0.6));
      // telhado de palha bem inclinado, com a cumeeira escura
      const roof = roofSurface(W + 3.2, D / 2 + 1.9, 4.3, 0.15, PALHA(), mat("palha-sob", () => new T.MeshStandardMaterial({ color: "#5a4632", roughness: 1, side: T.DoubleSide }))); roof.position.y = 0.45 + H + 4.0; g.add(roof);
      const ridge = box(W + 3.0, 0.5, 0.9, mat("cume-palha", () => new T.MeshStandardMaterial({ color: "#3a2e24", roughness: 0.9 })), 0, 0.45 + H + 4.15, 0); g.add(ridge);
      for (const s of [-1, 1]) { const sh = new T.Shape(); sh.moveTo(-D / 2 - 0.2, 0); sh.lineTo(D / 2 + 0.2, 0); sh.lineTo(0, 3.9); sh.closePath(); const gm = new T.Mesh(new T.ShapeGeometry(sh), wall); gm.rotation.y = Math.PI / 2; gm.position.set(s * (W / 2 + 0.05), 0.45 + H, 0); g.add(gm); }
      shadowOn(g); return g;
    }

    return { torii, toro, shimenawa, shimenawaAnel, haiden, minka, curvedBeam, VERM, PRETO, PEDRA, HINOKI, MADEIRA_ESC };
  };
})();
