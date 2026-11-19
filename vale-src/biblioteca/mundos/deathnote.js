/* Mundo de Linguagens: Death Note. O quarto de um estudante à noite: a luz da rua entra pela persiana em listras, a
   escrivaninha com o abajur, a gaveta entreaberta com o caderno preto, o saco de batatinhas, a TV mostrando o
   plantão da noite, a estante e a cama. Um visitante de capuz e máscara de osso flutua perto da janela (personagem original). Cada atividade é uma maçã da
   fruteira; o computador da mesa roda o jogo "Nós" (a atividade do jogo educativo). Tudo desenhado aqui. */
(() => {
  window.MUNDOS = window.MUNDOS || {};
  window.MUNDOS.deathnote = (ctx) => {
    const T = ctx.T, V3 = (x, y, z) => new T.Vector3(x, y, z);
    let seed = 13; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const keep = []; const K = (o) => { keep.push(o); return o; };
    const scene = new T.Scene(); scene.background = new T.Color("#06070a"); scene.fog = new T.Fog("#07080c", 7, 18);
    const camera = new T.PerspectiveCamera(52, ctx.aspect(), 0.05, 100);
    const RX = 3.4, RZ = 3.0, RH = 2.6;
    const OVERP = V3(1.05, 1.5, 0.75), OVERT = V3(-0.55, 0.92, -2.35);
    const uT = { value: 0 };
    const cv = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = K(new T.CanvasTexture(c)); t.anisotropy = 4; return t; };
    const std = (col, o = {}) => K(new T.MeshStandardMaterial(Object.assign({ color: col, roughness: 0.8 }, o)));
    const add = (geo, mat, x, y, z, ry = 0, rx = 0, rz = 0, parent) => { const m = new T.Mesh(K(geo), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); (parent || scene).add(m); return m; };

    /* ---------------- o quarto ---------------- */
    const floorT = cv(256, 256, (g, w, h) => { g.fillStyle = "#3a3026"; g.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) { g.fillStyle = `rgba(0,0,0,${0.2 + rnd() * 0.15})`; g.fillRect(0, i * 16, w, 1); g.fillRect((i * 61) % w, i * 16, 1, 16); } }); floorT.wrapS = floorT.wrapT = T.RepeatWrapping; floorT.repeat.set(3, 3);
    add(new T.PlaneGeometry(2 * RX, 2 * RZ), std("#ffffff", { map: floorT, roughness: 0.5 }), 0, 0, 0, 0, -Math.PI / 2);
    add(new T.PlaneGeometry(2 * RX, 2 * RZ), std("#3a3c42"), 0, RH, 0, 0, Math.PI / 2);
    const wallM = std("#8a8e96", { roughness: 0.95 });
    for (const [w, x, z, ry] of [[2 * RZ, -RX, 0, Math.PI / 2], [2 * RZ, RX, 0, -Math.PI / 2], [2 * RX, 0, RZ, Math.PI]]) add(new T.PlaneGeometry(w, RH), wallM, x, RH / 2, z, ry);
    // a parede da janela, com a persiana
    const WY0 = 0.95, WY1 = 2.2, WX0 = -2.1, WX1 = 0.6;
    add(new T.PlaneGeometry(2 * RX, WY0), wallM, 0, WY0 / 2, -RZ); add(new T.PlaneGeometry(2 * RX, RH - WY1), wallM, 0, (RH + WY1) / 2, -RZ);
    add(new T.PlaneGeometry(WX0 + RX, WY1 - WY0), wallM, (-RX + WX0) / 2, (WY0 + WY1) / 2, -RZ); add(new T.PlaneGeometry(RX - WX1, WY1 - WY0), wallM, (RX + WX1) / 2, (WY0 + WY1) / 2, -RZ);
    const night = cv(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0a1020"); gr.addColorStop(1, "#1a2236"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "#05060a"; for (let x = 0; x < w;) { const bw = 30 + rnd() * 70, bh = 40 + rnd() * 140; g.fillRect(x, h - bh, bw, bh); for (let k = 0; k < 10; k++) if (rnd() < 0.4) { g.fillStyle = "rgba(255,220,160,0.6)"; g.fillRect(x + 4 + rnd() * (bw - 8), h - bh + 6 + rnd() * (bh - 12), 3, 4); g.fillStyle = "#05060a"; } x += bw + 2; } });
    add(new T.PlaneGeometry(5, 2.5), K(new T.MeshBasicMaterial({ map: night, fog: false })), (WX0 + WX1) / 2, 1.6, -RZ - 1.2);
    const slatM = std("#c8ccd2", { roughness: 0.5 });
    const slats = []; for (let y = WY0 + 0.04; y < WY1; y += 0.07) { const s = add(new T.BoxGeometry(WX1 - WX0, 0.045, 0.004), slatM, (WX0 + WX1) / 2, y, -RZ + 0.06, 0, 0.6); slats.push(s); }
    // a luz da rua entrando em listras: um holofote com a sombra da persiana
    const stripes = cv(256, 256, (g, w, h) => { g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; for (let y = 0; y < h; y += 16) g.fillRect(0, y + 6, w, 8); const v = g.createRadialGradient(128, 128, 30, 128, 128, 128); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,1)"); g.fillStyle = v; g.fillRect(0, 0, w, h); });
    const street = new T.SpotLight("#8aa8e0", 6, 14, 0.42, 0.25, 1.2); street.position.set(-0.7, 2.6, -RZ - 1.8); street.target.position.set(0.6, 0.2, 1.0); street.map = stripes; scene.add(street, street.target);
    scene.add(new T.HemisphereLight("#3a4660", "#0a0806", 1.0));

    /* ---------------- a escrivaninha, o abajur, a gaveta, o computador ---------------- */
    const deskM = std("#5a4232", { roughness: 0.55 }), deskD = std("#3a2a20", { roughness: 0.6 });
    const DESK = V3(-0.75, 0, -RZ + 0.45);
    add(new T.BoxGeometry(1.7, 0.05, 0.75), deskM, DESK.x, 0.74, DESK.z);
    add(new T.BoxGeometry(0.45, 0.7, 0.7), deskD, DESK.x + 0.6, 0.36, DESK.z); add(new T.BoxGeometry(0.05, 0.72, 0.7), deskD, DESK.x - 0.82, 0.36, DESK.z);
    // a gaveta de cima entreaberta, com o caderno lá dentro
    const drawer = new T.Group(); drawer.position.set(DESK.x + 0.6, 0.6, DESK.z + 0.34); scene.add(drawer);
    add(new T.BoxGeometry(0.4, 0.12, 0.62), deskM, 0, 0, 0, 0, 0, 0, drawer); add(new T.BoxGeometry(0.42, 0.14, 0.02), deskD, 0, 0, 0.32, 0, 0, 0, drawer); add(new T.SphereGeometry(0.015, 8, 6), std("#b8a070", { metalness: 0.7, roughness: 0.3 }), 0, 0, 0.34, 0, 0, 0, drawer);
    const dnCover = cv(256, 360, (g, w, h) => { g.fillStyle = "#0a0a0c"; g.fillRect(0, 0, w, h); g.fillStyle = "#e8e8e8";  g.strokeStyle = "rgba(255,255,255,0.08)"; g.lineWidth = 2; g.strokeRect(10, 10, w - 20, h - 20); });
    const note = new T.Mesh(K(new T.BoxGeometry(0.17, 0.02, 0.24)), [std("#0a0a0c"), std("#0a0a0c"), std("#ffffff", { map: dnCover, roughness: 0.6 }), std("#0a0a0c"), std("#e8e2d2"), std("#e8e2d2")]); note.position.set(0, 0.07, 0.1); note.rotation.y = 0.2; drawer.add(note);
    new T.GLTFLoader().load(ctx.base + "caderno.glb", (gl) => { const m = gl.scene; const box = new T.Box3().setFromObject(m), sz = box.getSize(V3()), k = 0.24 / Math.max(sz.x, sz.z); m.scale.setScalar(k); m.position.set(-(box.min.x + box.max.x) / 2 * k, 0.06 - box.min.y * k, 0.1 - (box.min.z + box.max.z) / 2 * k); m.rotation.y = 0.2; m.traverse((o) => { if (o.isMesh) o.material = /PAPER/i.test(o.material.name) ? std("#e8e2d2") : std("#0c0c0e", { roughness: 0.6 }); }); drawer.add(m); note.visible = false; });
    // o abajur
    add(new T.CylinderGeometry(0.08, 0.1, 0.03, 16), std("#1a1a1c", { metalness: 0.4 }), DESK.x - 0.55, 0.78, DESK.z - 0.15); add(new T.CylinderGeometry(0.01, 0.01, 0.4, 6), std("#1a1a1c"), DESK.x - 0.55, 0.98, DESK.z - 0.15, 0, 0, 0.25);
    add(new T.ConeGeometry(0.11, 0.14, 18, 1, true), std("#1e2a24", { side: T.DoubleSide, metalness: 0.3 }), DESK.x - 0.48, 1.16, DESK.z - 0.12, 0, 0, 0.6);
    const desklamp = new T.SpotLight("#ffcc88", 5.0, 4, 0.9, 0.5, 1.3); desklamp.position.set(DESK.x - 0.45, 1.12, DESK.z - 0.1); desklamp.target.position.set(DESK.x + 0.1, 0.74, DESK.z + 0.05); scene.add(desklamp, desklamp.target);
    // o saco de batatinhas, aberto
    { const bag = new T.Group(); bag.position.set(DESK.x + 0.15, 0.77, DESK.z + 0.12); bag.rotation.y = -0.4; scene.add(bag); const bt = cv(128, 160, (g, w, h) => { g.fillStyle = "#c8282a"; g.fillRect(0, 0, w, h); g.fillStyle = "#f8d84a"; g.beginPath(); g.ellipse(64, 80, 44, 30, 0, 0, 7); g.fill(); g.fillStyle = "#c8282a"; g.font = "700 22px sans-serif"; g.textAlign = "center"; g.fillText("CHIPS", 64, 88); });
      add(new T.BoxGeometry(0.16, 0.22, 0.05), std("#ffffff", { map: bt, roughness: 0.35, metalness: 0.3 }), 0, 0.11, 0, 0, -0.3, 0, bag); for (let i = 0; i < 6; i++) add(new T.CircleGeometry(0.018, 8), std("#e8c060"), (rnd() - 0.5) * 0.2, 0.003 + i * 0.001, 0.1 + rnd() * 0.08, 0, -Math.PI / 2, 0, bag); }
    // o computador: o monitor roda o "Nós"
    const pc = new T.Group(); pc.position.set(DESK.x - 0.05, 0.765, DESK.z - 0.12); scene.add(pc);
    add(new T.BoxGeometry(0.5, 0.36, 0.38), std("#cfcac0", { roughness: 0.6 }), 0, 0.26, -0.05, 0, 0, 0, pc); add(new T.BoxGeometry(0.2, 0.06, 0.2), std("#cfcac0"), 0, 0.03, 0, 0, 0, 0, pc);
    const gc = document.createElement("canvas"); gc.width = 160; gc.height = 120; const gx = gc.getContext("2d"); const gameT = K(new T.CanvasTexture(gc)); gameT.magFilter = T.NearestFilter;
    const drawGame = (t) => { gx.fillStyle = "#0a0706"; gx.fillRect(0, 0, 160, 120); const cx = 80 + Math.sin(t * 0.7) * 6;
      for (let r = 70; r > 4; r -= 6) { const v = Math.floor(30 + (70 - r) * 1.4); gx.fillStyle = `rgb(${v},${Math.floor(v * 0.7)},${Math.floor(v * 0.45)})`; gx.beginPath(); gx.ellipse(cx, 64, r * 1.1, r * 0.8, 0, 0, 7); gx.fill(); }
      gx.fillStyle = "#ffd27a"; gx.fillRect(Math.round(cx) - 2, 60, 4, 4); gx.fillStyle = "#e8dcc8"; gx.font = "8px monospace"; gx.fillText("NÓS", 6, 12); gameT.needsUpdate = true; };
    drawGame(0);
    const screen = add(new T.PlaneGeometry(0.4, 0.29), K(new T.MeshBasicMaterial({ map: gameT })), 0, 0.27, 0.142, 0, 0, 0, pc);
    const pcLight = new T.PointLight("#ffb070", 0.5, 2, 2); pcLight.position.set(0, 0.3, 0.4); pc.add(pcLight);

    /* ---------------- a TV com o L, a estante, a cama ---------------- */
    const tv = new T.Group(); tv.position.set(RX - 0.55, 0.5, 0.2); tv.rotation.y = -Math.PI / 2; scene.add(tv);
    add(new T.BoxGeometry(0.8, 0.5, 0.45), std("#222428", { roughness: 0.5 }), 0, 0, 0, 0, 0, 0, tv); add(new T.BoxGeometry(0.9, 0.5, 0.5), deskD, 0, -0.26 - 0.01, 0, 0, 0, 0, tv);
    const lT = cv(320, 240, (g, w, h) => { g.fillStyle = "#f4f4f2"; g.fillRect(0, 0, w, h); g.fillStyle = "#1a2a4a"; g.fillRect(0, 0, w, h); g.fillStyle = "#c83a2a"; g.fillRect(0, h - 56, w, 34); g.fillStyle = "#fff"; g.font = "700 22px sans-serif"; g.textAlign = "left"; g.fillText("PLANTÃO · CASOS SEM EXPLICAÇÃO", 12, h - 32); g.fillStyle = "#d8d8e0"; g.font = "600 30px sans-serif"; g.fillText("AO VIVO", 16, 40); });
    const tvMat = K(new T.ShaderMaterial({ uniforms: { map: { value: lT }, uT }, vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform sampler2D map; uniform float uT; varying vec2 vU; void main(){ vec3 c = texture2D(map, vU).rgb; c *= 0.85 + 0.15 * sin(vU.y * 500.0 - uT * 8.0); c += (fract(sin(dot(vU * 300.0 + uT, vec2(12.9, 78.2))) * 43758.5) - 0.5) * 0.08; gl_FragColor = vec4(c, 1.0); }" }));
    add(new T.PlaneGeometry(0.66, 0.4), tvMat, 0, 0.02, 0.226, 0, 0, 0, tv);
    const tvLight = new T.PointLight("#dfe8ff", 0.8, 3.5, 2); tvLight.position.set(RX - 1.0, 0.6, 0.2); scene.add(tvLight);
    // estante
    { const sh = new T.Group(); sh.position.set(-RX + 0.2, 0, 0.4); sh.rotation.y = Math.PI / 2; scene.add(sh); add(new T.BoxGeometry(1.2, 1.9, 0.32), deskD, 0, 0.95, 0, 0, 0, 0, sh);
      for (let k = 0; k < 4; k++) for (let i = 0; i < 12; i++) { const h = 0.22 + rnd() * 0.1; add(new T.BoxGeometry(0.06 + rnd() * 0.03, h, 0.24), std(["#3a4a6a", "#6a2a2a", "#2a4a3a", "#8a7a5a", "#2a2a2e"][Math.floor(rnd() * 5)]), -0.5 + i * 0.085, 0.12 + k * 0.45 + h / 2, 0.06, 0, 0, 0, sh); } }
    // a cama
    add(new T.BoxGeometry(1.0, 0.35, 2.0), std("#2a2c34"), RX - 0.6, 0.18, RZ - 1.15); add(new T.BoxGeometry(0.96, 0.12, 1.9), std("#5a6278", { roughness: 1 }), RX - 0.6, 0.41, RZ - 1.15); add(new T.BoxGeometry(0.6, 0.1, 0.32), std("#c8ccd4"), RX - 0.6, 0.5, RZ - 0.4);
    // a cadeira, virada
    { const ch = new T.Group(); ch.position.set(DESK.x - 0.35, 0, DESK.z + 0.8); ch.rotation.y = 0.9; scene.add(ch); const cm = std("#1e1e22", { roughness: 0.5 }); add(new T.BoxGeometry(0.46, 0.08, 0.46), cm, 0, 0.47, 0, 0, 0, 0, ch); add(new T.BoxGeometry(0.46, 0.55, 0.06), cm, 0, 0.82, 0.22, 0, -0.1, 0, ch); add(new T.CylinderGeometry(0.03, 0.03, 0.4, 8), std("#777", { metalness: 0.8 }), 0, 0.23, 0, 0, 0, 0, ch); for (let i = 0; i < 5; i++) add(new T.BoxGeometry(0.3, 0.02, 0.03), std("#555", { metalness: 0.8 }), Math.cos(i * 1.256) * 0.15, 0.04, Math.sin(i * 1.256) * 0.15, -i * 1.256, 0, 0, ch); }

    /* ---------------- o visitante: uma criatura alta de capuz e máscara de osso (personagem original) ---------------- */
    const ryuk = new T.Group(); ryuk.position.set(0.85, 0.0, -2.45); ryuk.rotation.y = -0.35; scene.add(ryuk);
    const OUTM = K(new T.MeshBasicMaterial({ color: "#000", side: T.BackSide }));
    const part = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, parent = ryuk, ol = true) => { const m = add(geo, mat, x, y, z, ry, rx, rz, parent); m.scale.set(sx, sy, sz); if (ol) { const o = new T.Mesh(m.geometry, OUTM); o.scale.setScalar(1.04); m.add(o); } return m; };
    { const cloth = std("#1a1622", { roughness: 0.9, side: T.DoubleSide }), bone = std("#e8e2d4", { roughness: 0.5 }), claw = std("#3a3440");
      // o manto comprido que termina em farrapos, flutuando sem tocar o chão
      const robe = part(new T.CylinderGeometry(0.16, 0.42, 1.6, 18, 6, true), cloth, 0, 1.0, 0); { const p = robe.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < -0.6) { const a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, y - Math.abs(Math.sin(a * 5)) * 0.25); } } robe.geometry.computeVertexNormals(); }
      part(new T.ConeGeometry(0.2, 0.42, 16, 1, true), cloth, 0, 2.02, -0.02); // o capuz
      for (let k = 0; k < 9; k++) { const a = -1.2 + k * 0.3; part(new T.ConeGeometry(0.04, 0.3, 4), std("#0e0c12"), Math.sin(a) * 0.2, 1.72, Math.cos(a) * -0.06 - 0.04, 0.5, 0, a * 0.6, 1, 1, 1, ryuk, false); } // gola de penas
      const mask = part(new T.SphereGeometry(0.13, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.75), bone, 0, 1.9, 0.05, -0.2, 0, 0, 0.85, 1.15, 0.7);
      const eye = new T.Mesh(K(new T.PlaneGeometry(0.02, 0.12)), K(new T.MeshBasicMaterial({ color: "#c89aff" }))); eye.position.set(0, 1.92, 0.15); ryuk.add(eye); void mask;
      const eg = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xb07aff, transparent: true, opacity: 0.6, depthWrite: false, blending: T.AdditiveBlending }))); eg.scale.set(0.25, 0.4, 1); eg.position.set(0, 1.92, 0.17); ryuk.add(eg);
      for (const s2 of [-1, 1]) { part(new T.CapsuleGeometry(0.035, 0.6, 5, 10), cloth, s2 * 0.22, 1.35, 0.1, -0.4, 0, s2 * 0.25); part(new T.CapsuleGeometry(0.025, 0.45, 5, 10), claw, s2 * 0.32, 0.92, 0.34, -0.9, 0, s2 * 0.1);
        for (let k = 0; k < 3; k++) part(new T.ConeGeometry(0.01, 0.12, 5), bone, s2 * (0.34 + (k - 1) * 0.02), 0.78, 0.46, -2.2, 0, 0, 1, 1, 1, ryuk, false);
        // asas de ossos com membrana rasgada
        const wing = new T.Group(); wing.position.set(s2 * 0.12, 1.65, -0.12); wing.rotation.set(0.1, s2 * 0.5, s2 * 0.4); ryuk.add(wing);
        for (let k = 0; k < 4; k++) { const b = add(new T.CylinderGeometry(0.01, 0.006, 0.9 - k * 0.12, 5), bone, s2 * (0.2 + k * 0.12), 0.25 - k * 0.12, 0, 0, 0, -s2 * (0.6 + k * 0.25), wing); void b; }
        const mem = add(new T.CircleGeometry(0.55, 10, Math.PI * (s2 > 0 ? 0 : 0.5), Math.PI * 0.5), std("#120e18", { side: T.DoubleSide, transparent: true, opacity: 0.85 }), 0, 0, -0.01, 0, 0, 0, wing); void mem; }
      ryuk.userData.head = mask; }
    const ryukLight = new T.PointLight("#9a7acc", 0.8, 2.4, 2); ryukLight.position.set(1.0, 2.0, -1.9); scene.add(ryukLight);

    /* ---------------- as maçãs: uma atividade em cada ---------------- */
    const sub = ctx.subjects().find((s) => s.name === "Área de Linguagens") || { name: "Área de Linguagens", acts: [] };
    const GAME = sub.acts.findIndex((a) => /jogo/i.test(a.t));
    const appleIdx = sub.acts.map((a, i) => i).filter((i) => i !== GAME);
    const bowlPos = V3(DESK.x + 0.48, 0.765, DESK.z + 0.22);
    add(new T.CylinderGeometry(0.16, 0.08, 0.07, 22, 1, true), std("#d8d0c0", { side: T.DoubleSide, roughness: 0.3 }), bowlPos.x, bowlPos.y + 0.035, bowlPos.z);
    const appleM = () => K(new T.MeshStandardMaterial({ color: "#b81418", roughness: 0.35, emissive: new T.Color("#300000"), emissiveIntensity: 1 }));
    const apples = appleIdx.map((ai, k) => { const n = appleIdx.length, a = k / n * Math.PI * 2, r = k < 4 ? 0.075 : 0.0, y = k < 4 ? 0.1 : 0.17;
      const g = new T.Group(); g.position.set(bowlPos.x + Math.cos(a) * r, bowlPos.y + y, bowlPos.z + Math.sin(a) * r); scene.add(g);
      const m = new T.Mesh(K(new T.SphereGeometry(0.05, 20, 16)), appleM()); m.scale.set(1, 0.9, 1); g.add(m); add(new T.CylinderGeometry(0.004, 0.004, 0.03, 5), std("#4a2a10"), 0, 0.05, 0, 0, 0, 0.2, g);
      const glow = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xff4040, transparent: true, opacity: 0.25, depthWrite: false, blending: T.AdditiveBlending }))); glow.scale.set(0.22, 0.22, 1); g.add(glow);
      return { g, m, glow, a: sub.acts[ai], i: ai, hot: 0, bite: 0 }; });
    const pcItem = GAME >= 0 ? { pc: true, a: sub.acts[GAME], i: GAME, hot: 0 } : null;

    /* ---------------- o som: o relógio, um zumbido baixo, a mordida ---------------- */
    let audio = null;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)(), out = ac.createGain(); out.gain.value = 0; out.connect(ac.destination); const nodes = [];
      for (const [f, gv] of [[55, 0.05], [82.4, 0.025]]) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.value = gv; o.connect(g).connect(out); o.start(); nodes.push(o); }
      const tick = () => { if (!audio) return; const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = "square"; o.frequency.value = 1800; g.gain.setValueAtTime(0.01, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.025); o.connect(g).connect(out); o.start(t0); o.stop(t0 + 0.03); setTimeout(tick, 1000); }; setTimeout(tick, 300);
      const crunch = () => { const t0 = ac.currentTime, n = ac.createBuffer(1, ac.sampleRate * 0.25, ac.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2) * (Math.random() < 0.3 ? 1 : 0.3); const s = ac.createBufferSource(); s.buffer = n; const f = ac.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 900; const g = ac.createGain(); g.gain.value = 0.35; s.connect(f).connect(g).connect(out); s.start(t0); };
      out.gain.linearRampToValueAtTime(0.7, ac.currentTime + 2); audio = { ac, out, nodes, crunch };
    } catch (e) { audio = null; }

    /* ---------------- câmera ---------------- */
    const OVER = { pos: OVERP.clone(), tgt: OVERT.clone() };
    const cam = { pos: OVER.pos.clone(), tgt: OVER.tgt.clone(), yaw: 0, pitch: 0, yawT: 0, pitchT: 0 };
    let glide = null, focus = null, hot = null;
    const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
    function to(pose, dur = 2.0) { if (ctx.reduce) { cam.pos.copy(pose.pos); cam.tgt.copy(pose.tgt); return; } glide = { p0: cam.pos.clone(), t0: cam.tgt.clone(), p1: pose.pos.clone(), t1: pose.tgt.clone(), u: 0, dur }; cam.yawT = cam.pitchT = 0; }
    function openItem(it) { focus = it; const p = it.pc ? pc.position.clone().add(V3(0, 0.27, 0)) : it.g.position; to({ pos: p.clone().add(V3(0.55, 0.42, 0.85)), tgt: p.clone() }); if (!it.pc) { it.bite = 1; if (audio) setTimeout(() => audio.crunch(), ctx.reduce ? 0 : 1100); }
      setTimeout(() => { if (focus === it) ctx.openAct(sub.name, it.i); }, ctx.reduce ? 0 : 1500); }
    setTimeout(() => { try { ctx.toast("Death Note", "O quarto do caderno", "Cada maçã da fruteira guarda uma atividade. O computador roda o Nós."); } catch (e) { /* sem aviso */ } }, 900);

    const ray = new T.Raycaster();
    const fx = ctx.fantasy(scene, { center: V3(0.1, 1.5, -1.2), radius: 2.6, height: 1.2, colors: ["#b07aff", "#7affc8", "#ff6a8a"], count: 4, power: 0.6, dim: 0.75, motes: 160, moteSize: 0.01 });
    return {
      name: "O quarto do caderno", sub: "Linguagens",
      update(dt, t) {
        fx.update(t);
        uT.value = t;
        if (glide) { glide.u = Math.min(1, glide.u + dt / glide.dur); const e = smoother(glide.u); cam.pos.lerpVectors(glide.p0, glide.p1, e); cam.tgt.lerpVectors(glide.t0, glide.t1, e); if (glide.u >= 1) glide = null; }
        const k = 1 - Math.exp(-dt * 3.5); cam.yaw += (cam.yawT - cam.yaw) * k; cam.pitch += (cam.pitchT - cam.pitch) * k;
        const d = cam.tgt.clone().sub(cam.pos), r = d.length(), yw = Math.atan2(d.z, d.x) + cam.yaw, pt = Math.asin(Math.max(-0.99, Math.min(0.99, d.y / r))) + cam.pitch;
        camera.position.copy(cam.pos).add(V3(0, Math.sin(t * 0.45) * 0.008, 0)); camera.lookAt(cam.pos.x + Math.cos(yw) * Math.cos(pt), cam.pos.y + Math.sin(pt), cam.pos.z + Math.sin(yw) * Math.cos(pt));
        // o visitante flutua devagar, sem tocar o chão
        ryuk.position.y = 0.12 + Math.sin(t * 0.9) * 0.05; ryuk.rotation.y = -0.35 + Math.sin(t * 0.25) * 0.12;
        slats.forEach((s, i) => (s.rotation.x = 0.6 + Math.sin(t * 0.4 + i * 0.3) * 0.015));
        if (Math.floor(t * 8) !== Math.floor((t - dt) * 8)) drawGame(t);
        tvLight.intensity = 0.8 * (0.9 + 0.1 * Math.sin(t * 30));
        for (const a of apples) { a.hot += ((hot === a || focus === a ? 1 : 0) - a.hot) * Math.min(1, dt * 6); a.glow.material.opacity = 0.2 + 0.1 * Math.sin(t * 2 + a.i) + a.hot * 0.5; a.m.material.emissiveIntensity = 1 + a.hot * 3; a.g.position.y += ((a.hot ? 0.02 : 0) - 0) * 0; }
        if (pcItem) pcItem.hot += ((hot === pcItem || focus === pcItem ? 1 : 0) - pcItem.hot) * Math.min(1, dt * 6); pcLight.intensity = 0.5 + (pcItem ? pcItem.hot : 0) * 0.8;
      },
      render(renderer) { renderer.setRenderTarget(null); renderer.render(scene, camera); },
      resize(w, h) { camera.aspect = w / h; const tall = w / h < 0.8; camera.fov = tall ? 72 : 52; camera.updateProjectionMatrix(); OVER.pos.copy(tall ? V3(2.2, 1.7, 2.7) : OVERP); if (!focus && !glide) cam.pos.copy(OVER.pos); },
      pick(ndc) { ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(apples.map((a) => a.m).concat([screen]), false); const o = hits[0] && hits[0].object; const ap = o && apples.find((a) => a.m === o);
        hot = ap || (o === screen ? pcItem : null);
        if (ap) return { label: [ap.a.t, "uma maçã para o visitante"], go: () => openItem(ap) };
        if (o === screen && pcItem) return { label: [pcItem.a.t, "jogar o Nós"], go: () => openItem(pcItem) };
        return null; },
      look(dx, dy) { if (glide) return; cam.yawT = Math.max(-0.9, Math.min(0.9, cam.yawT - dx * 0.003)); cam.pitchT = Math.max(-0.3, Math.min(0.4, cam.pitchT - dy * 0.003)); },
      back() { if (focus) { focus = null; to(OVER); return true; } return false; },
      dispose() { if (audio) { const a = audio; audio = null; try { a.out.gain.linearRampToValueAtTime(0, a.ac.currentTime + 0.5); setTimeout(() => { a.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* já parou */ } }); a.ac.close(); }, 700); } catch (e) { /* sem som */ } } keep.forEach((o) => o.dispose && o.dispose()); },
    };
  };
})();
