/* Mundo do Quem sou: Tokyo Ghoul. O café Anteiku numa noite de chuva no 20º distrito: o balcão com os sifões
   de café, as xícaras na prateleira, as luminárias baixas, a janela grande com a chuva escorrendo e a cidade
   desfocada lá fora. Uma estudante lê na mesa da janela e o dono do café enxuga xícaras atrás do balcão
   (personagens originais). Os livros da mesa guardam quem eu sou. Tudo é desenhado aqui. */
(() => {
  window.MUNDOS = window.MUNDOS || {};
  window.MUNDOS.anteiku = (ctx) => {
    const T = ctx.T, V3 = (x, y, z) => new T.Vector3(x, y, z), base = ctx.base + "anteiku/";
    let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const keep = []; const K = (o) => { keep.push(o); return o; };
    const scene = new T.Scene(); scene.background = new T.Color("#120c0a"); scene.fog = new T.Fog("#1a1210", 9, 22);
    const camera = new T.PerspectiveCamera(50, ctx.aspect(), 0.05, 120);
    const RX = 4.6, RZ = 3.6, RH = 3.2;
    const OVERP = V3(-1.35, 1.5, 0.55), OVERT = V3(0.2, 0.95, -2.35);

    const PROC0 = scene.children.length; // daqui até as pessoas é o salão desenhado à mão (some se o modelo do café carregar)
    /* ---------------- o salão ---------------- */
    const cv = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = K(new T.CanvasTexture(c)); t.anisotropy = 4; return t; };
    const lam = (col, o = {}) => K(new T.MeshStandardMaterial(Object.assign({ color: col, roughness: 0.75, metalness: 0 }, o)));
    const add = (geo, mat, x, y, z, ry = 0, rx = 0, rz = 0, parent) => { const m = new T.Mesh(K(geo), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); (parent || scene).add(m); return m; };
    const floorT = cv(256, 256, (g, w, h) => { for (let i = 0; i < 8; i++) { const v = 60 + Math.floor(rnd() * 25); g.fillStyle = `rgb(${v},${Math.floor(v * 0.62)},${Math.floor(v * 0.4)})`; g.fillRect(0, i * 32, w, 32); g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(0, i * 32, w, 2); g.fillRect((i * 97) % w, i * 32, 2, 32); }
      for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.08})`; g.fillRect(rnd() * w, rnd() * h, 6 + rnd() * 20, 1); } }); floorT.wrapS = floorT.wrapT = T.RepeatWrapping; floorT.repeat.set(4, 3);
    add(new T.PlaneGeometry(2 * RX, 2 * RZ), lam("#ffffff", { map: floorT, roughness: 0.45 }), 0, 0, 0, 0, -Math.PI / 2);
    add(new T.PlaneGeometry(2 * RX, 2 * RZ), lam("#2a1e18"), 0, RH, 0, 0, Math.PI / 2);
    for (let x = -RX + 0.6; x < RX; x += 1.2) add(new T.BoxGeometry(0.12, 0.16, 2 * RZ), lam("#3a2618"), x, RH - 0.08, 0); // vigas do teto
    const plaster = lam("#c8b494", { roughness: 0.95 }), wainsc = lam("#4a2e1c", { roughness: 0.6 });
    // paredes: lambri escuro embaixo, reboco claro em cima
    for (const [w, x, z, ry] of [[2 * RZ, -RX, 0, Math.PI / 2], [2 * RZ, RX, 0, -Math.PI / 2], [2 * RX, 0, RZ, Math.PI]]) { add(new T.PlaneGeometry(w, RH - 1.1), plaster, x, 1.1 + (RH - 1.1) / 2, z, ry); add(new T.PlaneGeometry(w, 1.1), wainsc, x * 0.999, 0.55, z * 0.999, ry); }
    // a parede da janela: o vão grande, com caixilho de madeira
    const WY0 = 0.85, WY1 = 2.65, WX = 3.2;
    add(new T.PlaneGeometry(2 * RX, WY0), wainsc, 0, WY0 / 2, -RZ); add(new T.PlaneGeometry(2 * RX, RH - WY1), plaster, 0, (RH + WY1) / 2, -RZ);
    for (const s of [-1, 1]) add(new T.PlaneGeometry(RX - WX, WY1 - WY0), plaster, s * (RX + WX) / 2, (WY0 + WY1) / 2, -RZ);
    const frameM = lam("#3a2416", { roughness: 0.5 });
    for (const y of [WY0, WY1]) add(new T.BoxGeometry(2 * WX + 0.1, 0.08, 0.14), frameM, 0, y, -RZ + 0.02);
    for (let x = -WX; x <= WX + 0.01; x += WX / 2) add(new T.BoxGeometry(0.07, WY1 - WY0, 0.12), frameM, x, (WY0 + WY1) / 2, -RZ + 0.02);
    add(new T.BoxGeometry(2 * WX, 0.04, 0.3), frameM, 0, WY0 - 0.02, -RZ + 0.12);
    // lá fora: a cidade à noite, desfocada pela chuva
    const city = cv(1024, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0a0e1a"); gr.addColorStop(0.7, "#1a1a2a"); gr.addColorStop(1, "#2a1a1e"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = "#06070c"; let x = 0; while (x < w) { const bw = 50 + rnd() * 120, bh = 120 + rnd() * 300; g.fillRect(x, h - bh, bw, bh); for (let k = 0; k < 24; k++) if (rnd() < 0.5) { g.fillStyle = rnd() < 0.7 ? "rgba(255,200,130,0.6)" : "rgba(150,200,255,0.5)"; g.fillRect(x + 6 + rnd() * (bw - 14), h - bh + 10 + rnd() * (bh - 30), 5, 7); g.fillStyle = "#06070c"; } x += bw + 3; }
      for (let i = 0; i < 70; i++) { const bx = rnd() * w, by = h * 0.45 + rnd() * h * 0.5, r = 8 + rnd() * 30, c = ["255,120,90", "255,200,120", "120,200,255", "255,90,160"][i % 4]; const rg = g.createRadialGradient(bx, by, 0, bx, by, r); rg.addColorStop(0, `rgba(${c},0.55)`); rg.addColorStop(1, `rgba(${c},0)`); g.fillStyle = rg; g.fillRect(bx - r, by - r, r * 2, r * 2); } });
    add(new T.PlaneGeometry(12, 6), K(new T.MeshBasicMaterial({ map: city, fog: false })), 0, 1.9, -RZ - 2.5);
    // o vidro: gotas escorrendo e embaçado
    const uT = { value: 0 };
    add(new T.PlaneGeometry(2 * WX, WY1 - WY0), K(new T.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT },
      vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform float uT; varying vec2 vU; float h(float n){ return fract(sin(n * 12.9898) * 43758.5453); }
        void main(){ vec2 p = vU * vec2(14.0, 4.0); float a = 0.0; for (int i = 0; i < 3; i++) { float fi = float(i); vec2 q = p * (1.0 + fi * 0.6) + fi * 3.1; float col = floor(q.x); float sp = 0.25 + h(col + fi) * 0.5; float y = fract(q.y * 0.5 + uT * sp + h(col * 1.7 + fi)); vec2 c = vec2(fract(q.x) - 0.5, y - 0.5);
          a += smoothstep(0.08, 0.0, length(c * vec2(1.0, 0.6))) * 0.6 + smoothstep(0.03, 0.0, abs(c.x)) * smoothstep(0.5, 0.0, c.y) * smoothstep(-0.5, 0.0, c.y) * 0.25; }
          gl_FragColor = vec4(vec3(0.7, 0.8, 0.95), 0.08 + a * 0.35); }` })), 0, (WY0 + WY1) / 2, -RZ + 0.03);
    // a placa de dentro, na parede: あんていく
    { const sg = cv(512, 160, (g, w, h) => { g.fillStyle = "#2a1a10"; g.fillRect(0, 0, w, h); g.strokeStyle = "#b8925a"; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = "#e8d4a8"; g.font = "700 76px 'Shippori Mincho', serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("あんていく", w / 2, h / 2 + 4); });
      add(new T.PlaneGeometry(1.6, 0.5), K(new T.MeshStandardMaterial({ map: sg, roughness: 0.6 })), -RX + 0.02, 2.35, -0.6, Math.PI / 2); }

    /* ---------------- o balcão, os sifões e as xícaras ---------------- */
    const bar = new T.Group(); bar.position.set(RX - 0.75, 0, 0.4); scene.add(bar);
    add(new T.BoxGeometry(0.7, 1.02, 4.2), lam("#3a2214", { roughness: 0.55 }), 0, 0.51, 0, 0, 0, 0, bar); add(new T.BoxGeometry(0.86, 0.06, 4.36), lam("#5a3a22", { roughness: 0.3, metalness: 0.1 }), -0.05, 1.05, 0, 0, 0, 0, bar);
    for (let z = -1.8; z <= 1.81; z += 0.6) add(new T.BoxGeometry(0.02, 0.8, 0.5), lam("#2a160c"), -0.36, 0.5, z, 0, 0, 0, bar);
    const glassM = K(new T.MeshStandardMaterial({ color: "#c8d8e0", roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35 })), brass = lam("#b8925a", { roughness: 0.35, metalness: 0.7 });
    const flames = [];
    for (const z of [-1.2, -0.5, 0.2]) { const s = new T.Group(); s.position.set(0.05, 1.08, z); bar.add(s); add(new T.CylinderGeometry(0.06, 0.08, 0.04, 16), brass, 0, 0.02, 0, 0, 0, 0, s); add(new T.CylinderGeometry(0.008, 0.008, 0.42, 6), brass, 0.09, 0.22, 0, 0, 0, 0, s);
      add(new T.SphereGeometry(0.08, 18, 14), glassM, 0, 0.16, 0, 0, 0, 0, s); const coffee = add(new T.SphereGeometry(0.07, 16, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), lam("#2a1206", { roughness: 0.2 }), 0, 0.16, 0, 0, 0, 0, s); void coffee;
      add(new T.CylinderGeometry(0.055, 0.03, 0.2, 16, 1, true), glassM, 0, 0.36, 0, 0, 0, 0, s);
      const fl = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0x5a8aff, transparent: true, opacity: 0.8, depthWrite: false, blending: T.AdditiveBlending }))); fl.scale.set(0.06, 0.1, 1); fl.position.set(0, 0.06, 0); s.add(fl); flames.push(fl); }
    // prateleiras de xícaras atrás do balcão
    const cupM = lam("#efe8dc", { roughness: 0.3 });
    for (const y of [1.55, 1.95, 2.35]) { add(new T.BoxGeometry(0.3, 0.03, 4.0), lam("#4a2e1c"), RX - 0.16, y, 0.4); for (let z = -1.5; z <= 2.3; z += 0.24) { add(new T.CylinderGeometry(0.04, 0.03, 0.07, 12), rnd() < 0.2 ? lam(["#6a2a2a", "#2a4a6a", "#3a5a3a"][Math.floor(rnd() * 3)], { roughness: 0.3 }) : cupM, RX - 0.18, y + 0.05, z); } }
    // as luminárias baixas
    const TBL0 = V3(0.15, 0, -2.3);
    const lamps = [];
    for (const [x, z] of [[0.15, -2.3], [-2.0, -0.6], [0.9, 0.9], [RX - 0.75, -0.6], [RX - 0.75, 1.4]]) { add(new T.CylinderGeometry(0.004, 0.004, 1.0, 4), lam("#111"), x, RH - 0.5, z); add(new T.ConeGeometry(0.2, 0.18, 20, 1, true), lam("#3a2a1a", { side: T.DoubleSide, metalness: 0.5, roughness: 0.4 }), x, RH - 1.05, z);
      add(new T.SphereGeometry(0.05, 12, 8), K(new T.MeshBasicMaterial({ color: "#ffd8a0" })), x, RH - 1.12, z); const pl = new T.PointLight("#ffc888", 1.1, 5, 2); pl.position.set(x, RH - 1.18, z); scene.add(pl); lamps.push(pl);
      const gl = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xffc888, transparent: true, opacity: 0.45, depthWrite: false, blending: T.AdditiveBlending }))); gl.scale.set(0.7, 0.7, 1); gl.position.set(x, RH - 1.14, z); scene.add(gl); }
    scene.add(new T.HemisphereLight("#8a7a6a", "#1a1008", 1.1)); { const f = new T.PointLight("#ffd8b0", 1.6, 3.5, 2); f.position.set(TBL0.x - 0.4, 1.55, TBL0.z + 0.7); scene.add(f); } const win = new T.DirectionalLight("#7a90c0", 0.35); win.position.set(0, 2, -8); scene.add(win);

    /* ---------------- mesas e cadeiras ---------------- */
    const woodT = lam("#4a2c18", { roughness: 0.4 }), woodC = lam("#3a2214", { roughness: 0.6 });
    const table = (x, z) => { add(new T.CylinderGeometry(0.5, 0.5, 0.04, 28), woodT, x, 0.74, z); add(new T.CylinderGeometry(0.04, 0.05, 0.72, 10), woodC, x, 0.37, z); add(new T.CylinderGeometry(0.25, 0.28, 0.03, 18), woodC, x, 0.015, z); };
    const chair = (x, z, ry) => { const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); add(new T.BoxGeometry(0.42, 0.04, 0.42), woodC, 0, 0.45, 0, 0, 0, 0, g); for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) add(new T.CylinderGeometry(0.018, 0.018, 0.45, 6), woodC, a, 0.225, b, 0, 0, 0, g);
      add(new T.BoxGeometry(0.42, 0.42, 0.03), woodC, 0, 0.7, -0.2, 0, 0, 0, g); return g; };
    const TBL = V3(0.15, 0, -2.3);
    table(TBL.x, TBL.z); chair(TBL.x, TBL.z - 0.62, 0); chair(TBL.x + 0.6, TBL.z + 0.32, -2.1);
    for (const [x, z] of [[-2.0, -0.6], [0.9, 0.9], [-2.2, 1.6]]) { table(x, z); chair(x - 0.62, z, Math.PI / 2); chair(x + 0.62, z, -Math.PI / 2); }
    // na mesa da janela: duas xícaras com vapor, a máscara e os livros
    const steams = [];
    for (const [x, z] of [[TBL.x - 0.12, TBL.z - 0.2], [TBL.x + 0.28, TBL.z + 0.12]]) { add(new T.CylinderGeometry(0.075, 0.075, 0.01, 18), cupM, x, 0.765, z); add(new T.CylinderGeometry(0.045, 0.035, 0.07, 14), cupM, x, 0.8, z); add(new T.CircleGeometry(0.04, 14), lam("#2a1206", { roughness: 0.15 }), x, 0.832, z, 0, -Math.PI / 2);
      const st = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xffffff, transparent: true, opacity: 0.12, depthWrite: false }))); st.scale.set(0.12, 0.3, 1); st.position.set(x, 0.98, z); scene.add(st); steams.push(st); }

    const PROC1 = scene.children.length;
    /* ---------------- as pessoas do café (personagens originais) ---------------- */
    const bookM = (col) => [lam(col), lam(col), lam("#e8e0cc"), lam(col), lam(col), lam(col)];
    const openBook = (parent, col, x, y, z, rx) => { const bk = new T.Group(); bk.position.set(x, y, z); bk.rotation.x = rx; parent.add(bk);
      add(new T.BoxGeometry(0.16, 0.012, 0.22), lam(col), -0.08, 0, 0, 0, 0, 0.12, bk); add(new T.BoxGeometry(0.16, 0.012, 0.22), lam(col), 0.08, 0, 0, 0, 0, -0.12, bk);
      add(new T.BoxGeometry(0.15, 0.02, 0.2), lam("#ece4d0"), -0.075, 0.012, 0, 0, 0, 0.12, bk); add(new T.BoxGeometry(0.15, 0.02, 0.2), lam("#ece4d0"), 0.075, 0.012, 0, 0, 0, -0.12, bk); return bk; };
    // uma estudante lendo na mesa da janela, de cachecol mostarda
    const reader = ctx.person({ h: 1.6, skin: "#f0d0b4", hair: "#6a3a22", hairStyle: "trancas", ribbon: "#d8a83a", top: "#5a7a5a", bottom: "#3a3040", skirt: true, socks: "#2a2a30", longSleeves: true, blush: true });
    reader.sit(); reader.read(); reader.g.position.set(TBL.x, 0.47 - reader.hipY, TBL.z - 0.62); scene.add(reader.g);
    add(new T.TorusGeometry(0.1, 0.035, 8, 18), lam("#d8a83a"), 0, 1.42, 0, 0, Math.PI / 2, 0, reader.body);
    openBook(reader.g, "#3a4a6a", 0, 0.98, 0.32, -0.9);
    // o dono do café atrás do balcão, enxugando uma xícara
    const owner = ctx.person({ h: 1.74, skin: "#ecc8a8", hair: "#c8c4bc", hairStyle: "curto", top: "#f0ece4", bottom: "#2a2a2e", longSleeves: true });
    owner.g.position.set(RX - 1.45, 0, 0.6); owner.g.rotation.y = -Math.PI / 2 + 0.4; scene.add(owner.g);
    add(new T.BoxGeometry(0.34, 0.5, 0.02), lam("#2a2a2e"), 0, 1.15, 0.12, 0, 0, 0, owner.body); // o avental
    owner.arms.forEach((a, i) => { a.sh.rotation.x = -0.9; a.sh.rotation.z = (i ? -1 : 1) * 0.35; a.el.rotation.x = -1.0; });
    const cupO = add(new T.CylinderGeometry(0.045, 0.035, 0.07, 14), cupM, 0, 1.02, 0.34, 0, 0, 0, owner.body); void cupO;
    /* ---------------- os livros do perfil, empilhados na mesa ---------------- */
    const perfil = ctx.perfil ? ctx.perfil() : { name: "Quem sou", acts: [] };
    const tomes = [];
    perfil.acts.forEach((a, i) => { const g = new T.Group(); g.position.set(TBL.x + 0.05 + i * 0.02, 0.76 + i * 0.045, TBL.z + 0.32 - i * 0.02); g.rotation.y = 0.3 - i * 0.25; scene.add(g);
      const sp = cv(256, 64, (c, w, h) => { c.fillStyle = ["#7a1e1e", "#1e2e4a", "#2a3a22", "#4a3a1e"][i % 4]; c.fillRect(0, 0, w, h); c.fillStyle = "#d8b878"; c.font = "600 28px 'Cormorant Garamond', serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(a.t, w / 2, h / 2); });
      const mats = bookM(["#7a1e1e", "#1e2e4a", "#2a3a22", "#4a3a1e"][i % 4]); mats[4] = K(new T.MeshStandardMaterial({ map: sp, roughness: 0.6 })); const b = new T.Mesh(K(new T.BoxGeometry(0.22, 0.04, 0.3)), mats); g.add(b);
      // a lombada fica virada para a câmera
      b.rotation.y = 0; const glow = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xffc070, transparent: true, opacity: 0.35, depthWrite: false, blending: T.AdditiveBlending }))); glow.scale.set(0.5, 0.5, 1); g.add(glow);
      tomes.push({ g, b, glow, a, i, hot: 0 }); });

    /* ---------------- o café de verdade: o modelo do salão que o Fernando mandou ---------------- */
    const OVER_MODEL = { pos: V3(-5.6, 2.15, 0.6), tgt: V3(0.4, 0.95, 1.4) };
    new T.GLTFLoader().load(base + "cafe.glb", (gl) => {
      const m = gl.scene, S = 6.5; m.scale.setScalar(S); m.position.set(0, 0.1, 0); m.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; const mt = o.material; if (mt && mt.map) mt.map.anisotropy = 4; } }); scene.add(m);
      // esconde o salão desenhado à mão (as luzes ficam)
      for (let k = PROC0; k < PROC1; k++) { const o = scene.children[k]; if (o && !o.isLight) o.visible = false; }
      for (let k = PROC0; k < PROC1; k++) { const o = scene.children[k]; if (o && o.isLight && o.isPointLight) o.intensity *= 0.6; }
      for (const [x, z] of [[0.2, -1.6], [-0.2, 1.8], [-1.5, 3.2], [0.6, 3.4], [-1.8, -1.0]]) { const l = new T.PointLight("#ffcc90", 0.7, 6, 2); l.position.set(x, 2.7, z); scene.add(l); }
      // a estudante na mesa da direita, os livros na outra mesa, o dono atrás do balcão
      reader.g.position.set(-1.51, 0.47 - reader.hipY, 2.95); reader.g.rotation.y = 0;
      const chairR = new T.Mesh(K(new T.BoxGeometry(0.42, 0.04, 0.42)), lam("#3a2214")); chairR.position.set(-1.51, 0.45, 2.95); scene.add(chairR);
      owner.g.position.set(1.25, 0.1, 0.2); owner.g.rotation.y = -Math.PI / 2; owner.body.traverse((o) => { if (o.material && o.material.color && o.material.isMeshToonMaterial) o.material.color.multiplyScalar(0.8); });
      kHit.position.set(1.25, 1.0, 0.2);
      tomes.forEach((tm, i) => { tm.g.position.set(0.57 + i * 0.03, 0.9 + i * 0.045, 3.62 - i * 0.02); tm.baseY = 0.9 + i * 0.045; });
      OVER.pos.copy(OVER_MODEL.pos); OVER.tgt.copy(OVER_MODEL.tgt); if (!focus && !glide) { cam.pos.copy(OVER.pos); cam.tgt.copy(OVER.tgt); }
      inModel = true;
    });
    let inModel = false;

    /* ---------------- o som: chuva no vidro, conversa baixa, o relógio ---------------- */
    let audio = null;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)(), out = ac.createGain(); out.gain.value = 0; out.connect(ac.destination);
      const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const nodes = []; for (const [f, q, gv] of [[1400, 0.6, 0.05], [300, 0.8, 0.03], [5000, 0.6, 0.012]]) { const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; const bq = ac.createBiquadFilter(); bq.type = "bandpass"; bq.frequency.value = f; bq.Q.value = q; const g = ac.createGain(); g.gain.value = gv; s.connect(bq).connect(g).connect(out); s.start(); nodes.push(s); }
      const tick = () => { if (!audio) return; const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = "square"; o.frequency.value = 2400; g.gain.setValueAtTime(0.008, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.02); o.connect(g).connect(out); o.start(t0); o.stop(t0 + 0.03); setTimeout(tick, 1000); }; setTimeout(tick, 400);
      const cup = () => { if (!audio) return; const t0 = ac.currentTime; for (const f of [2600, 3900]) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f + Math.random() * 200; g.gain.setValueAtTime(0.02, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4); o.connect(g).connect(out); o.start(t0); o.stop(t0 + 0.45); } setTimeout(cup, 6000 + Math.random() * 9000); }; setTimeout(cup, 3000);
      out.gain.linearRampToValueAtTime(0.75, ac.currentTime + 2.5); audio = { ac, out, nodes };
    } catch (e) { audio = null; }

    /* ---------------- câmera ---------------- */
    const OVER = { pos: OVERP.clone(), tgt: OVERT.clone() };
    const cam = { pos: OVER.pos.clone(), tgt: OVER.tgt.clone(), yaw: 0, pitch: 0, yawT: 0, pitchT: 0 };
    let glide = null, focus = null, hot = null, count = null;
    const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
    function to(pose, dur = 2.0) { if (ctx.reduce) { cam.pos.copy(pose.pos); cam.tgt.copy(pose.tgt); return; } glide = { p0: cam.pos.clone(), t0: cam.tgt.clone(), p1: pose.pos.clone(), t1: pose.tgt.clone(), u: 0, dur }; cam.yawT = cam.pitchT = 0; }
    function openTome(tm) { focus = tm; const tp = tm.g.position; to(inModel ? { pos: V3(tp.x - 1.1, 1.55, tp.z - 1.0), tgt: tp.clone() } : { pos: V3(TBL.x - 0.9, 1.45, TBL.z + 1.1), tgt: V3(TBL.x + 0.05, 0.8, TBL.z + 0.2) }); setTimeout(() => { if (focus === tm && ctx.openPages) ctx.openPages(perfil, tm.i); }, ctx.reduce ? 0 : 1500); }
    const kHit = new T.Mesh(K(new T.BoxGeometry(0.6, 1.3, 0.6)), K(new T.MeshBasicMaterial())); kHit.position.set(RX - 1.45, 1.0, 0.6); kHit.visible = false; scene.add(kHit);
    setTimeout(() => { try { ctx.toast("Tokyo Ghoul", "Anteiku", "Os livros em cima da mesa contam quem eu sou."); } catch (e) { /* sem aviso */ } }, 900);

    const ray = new T.Raycaster();
    return {
      name: "Anteiku", sub: "Quem sou",
      update(dt, t) {
        uT.value = t;
        if (glide) { glide.u = Math.min(1, glide.u + dt / glide.dur); const e = smoother(glide.u); cam.pos.lerpVectors(glide.p0, glide.p1, e); cam.tgt.lerpVectors(glide.t0, glide.t1, e); if (glide.u >= 1) glide = null; }
        const k = 1 - Math.exp(-dt * 3.5); cam.yaw += (cam.yawT - cam.yaw) * k; cam.pitch += (cam.pitchT - cam.pitch) * k;
        const d = cam.tgt.clone().sub(cam.pos), r = d.length(), yw = Math.atan2(d.z, d.x) + cam.yaw, pt = Math.asin(Math.max(-0.99, Math.min(0.99, d.y / r))) + cam.pitch;
        camera.position.copy(cam.pos).add(V3(0, Math.sin(t * 0.45) * 0.008, 0)); camera.lookAt(cam.pos.x + Math.cos(yw) * Math.cos(pt), cam.pos.y + Math.sin(pt), cam.pos.z + Math.sin(yw) * Math.cos(pt));
        flames.forEach((f, i) => { f.scale.set(0.06, 0.09 + 0.02 * Math.sin(t * 13 + i), 1); });
        steams.forEach((s, i) => { s.position.y = 0.96 + Math.sin(t * 0.7 + i) * 0.02; s.material.opacity = 0.1 + 0.04 * Math.sin(t * 1.3 + i * 2); });
        lamps.forEach((l, i) => (l.intensity = 1.1 * (0.97 + 0.03 * Math.sin(t * 9 + i))));
        for (const tm of tomes) { tm.hot += ((hot === tm || focus === tm ? 1 : 0) - tm.hot) * Math.min(1, dt * 6); tm.glow.material.opacity = 0.3 + 0.15 * Math.sin(t * 2 + tm.i) + tm.hot * 0.5; tm.g.position.y = (tm.baseY != null ? tm.baseY : 0.76 + tm.i * 0.045) + tm.hot * 0.03; }
        if (count && t - count.t0 > 0.6) { count.t0 = t; count.n -= 7; if (count.n < 900) count = null; }
      },
      render(renderer) { renderer.setRenderTarget(null); renderer.render(scene, camera); },
      resize(w, h) { camera.aspect = w / h; const tall = w / h < 0.8; camera.fov = tall ? 70 : 50; camera.updateProjectionMatrix(); OVER.pos.copy(inModel ? (tall ? V3(-3.4, 1.8, 0.0) : OVER_MODEL.pos) : tall ? V3(-2.6, 1.7, 3.4) : OVERP); if (!focus && !glide) cam.pos.copy(OVER.pos); },
      pick(ndc) { ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(tomes.map((x) => x.b).concat([kHit]), false); const o = hits[0] && hits[0].object; const tm = o && tomes.find((x) => x.b === o); hot = tm || null;
        if (tm) return { label: [tm.a.t, "abrir o livro"], go: () => openTome(tm) };
        if (o === kHit) return { label: ["O dono do café", "pedir um café"], go: () => { try { ctx.toast("Anteiku", "Um café por conta da casa", "Pode ficar o tempo que quiser."); } catch (e) { /* nada */ } } };
        return null; },
      look(dx, dy) { if (glide) return; cam.yawT = Math.max(-0.9, Math.min(0.9, cam.yawT - dx * 0.003)); cam.pitchT = Math.max(-0.3, Math.min(0.4, cam.pitchT - dy * 0.003)); },
      back() { if (focus) { focus = null; to(OVER); return true; } return false; },
      dispose() { if (audio) { const a = audio; audio = null; try { a.out.gain.linearRampToValueAtTime(0, a.ac.currentTime + 0.5); setTimeout(() => { a.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* já parou */ } }); a.ac.close(); }, 700); } catch (e) { /* sem som */ } } keep.forEach((o) => o.dispose && o.dispose()); },
    };
  };
})();
