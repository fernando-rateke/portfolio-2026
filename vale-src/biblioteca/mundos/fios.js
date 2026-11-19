/* Mundo da Área técnica: o quarto dos fios. Um quarto escuro, à noite, cheio de cabos e monitores de tubo.
   Cada monitor guarda uma matéria do curso técnico; o do meio, o curso inteiro. Clicar num monitor
   aproxima a câmera e abre as atividades. Um zumbido elétrico baixo (feito na hora pelo navegador)
   acompanha o quarto. O modelo do monitor foi mandado pelo dono do portfólio; o resto é feito aqui. */
(() => {
  window.MUNDOS = window.MUNDOS || {};
  window.MUNDOS.fios = (ctx) => {
    const T = ctx.T, base = ctx.base + "fios/";
    const V3 = (x, y, z) => new T.Vector3(x, y, z);
    const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const scene = new T.Scene(); scene.background = new T.Color("#04060a"); scene.fog = new T.FogExp2("#05080d", 0.06);
    const camera = new T.PerspectiveCamera(58, ctx.aspect(), 0.03, 80);
    const disposables = []; let hot = null;
    const keep = (o) => { disposables.push(o); return o; };

    /* ---------------- o quarto ---------------- */
    const RX = 4.6, RZ = 3.6, RHt = 3.0;
    const grime = (c1, c2, n = 256) => { const c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d"); g.fillStyle = c1; g.fillRect(0, 0, n, n); for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${c2},${(rnd() * 0.08).toFixed(3)})`; const s = 2 + rnd() * 14; g.fillRect(rnd() * n, rnd() * n, s, s * (0.3 + rnd())); } const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return keep(t); };
    const wallTex = grime("#1c2026", "0,0,0"); wallTex.repeat.set(3, 1.2);
    const floorTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#1a1714"; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 32) { g.fillStyle = `rgba(0,0,0,${0.25 + rnd() * 0.2})`; g.fillRect(0, y, 256, 2); for (let x = (y / 32) % 2 ? 0 : 64; x < 256; x += 128) g.fillRect(x, y, 2, 32); } for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${(rnd() * 0.03).toFixed(3)})`; g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 6, 1); } const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(4, 3); return keep(t); })();
    const wallMat = keep(new T.MeshStandardMaterial({ map: wallTex, color: "#9aa3ad", roughness: 0.95 }));
    const add = (geo, mat, x, y, z, ry = 0, rx = 0) => { const m = new T.Mesh(keep(geo), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); scene.add(m); return m; };
    add(new T.PlaneGeometry(2 * RX, 2 * RZ), keep(new T.MeshStandardMaterial({ map: floorTex, roughness: 0.8 })), 0, 0, 0, 0, -Math.PI / 2);
    add(new T.PlaneGeometry(2 * RX, 2 * RZ), keep(new T.MeshStandardMaterial({ color: "#121418", roughness: 1 })), 0, RHt, 0, 0, Math.PI / 2);
    add(new T.PlaneGeometry(2 * RX, RHt), wallMat, 0, RHt / 2, -RZ);
    add(new T.PlaneGeometry(2 * RX, RHt), wallMat, 0, RHt / 2, RZ, Math.PI);
    add(new T.PlaneGeometry(2 * RZ, RHt), wallMat, -RX, RHt / 2, 0, Math.PI / 2);
    // a parede da direita tem a janela: quatro pedaços em volta do vão
    const WX = RX, WZ0 = -1.7, WZ1 = 1.1, WY0 = 1.0, WY1 = 2.4;
    add(new T.PlaneGeometry(WZ0 + RZ, RHt), wallMat, WX, RHt / 2, (-RZ + WZ0) / 2, -Math.PI / 2);
    add(new T.PlaneGeometry(RZ - WZ1, RHt), wallMat, WX, RHt / 2, (RZ + WZ1) / 2, -Math.PI / 2);
    add(new T.PlaneGeometry(WZ1 - WZ0, WY0), wallMat, WX, WY0 / 2, (WZ0 + WZ1) / 2, -Math.PI / 2);
    add(new T.PlaneGeometry(WZ1 - WZ0, RHt - WY1), wallMat, WX, (RHt + WY1) / 2, (WZ0 + WZ1) / 2, -Math.PI / 2);
    // lá fora: céu de noite, telhados, postes e fios (desenhado aqui mesmo)
    const sky = (() => {
      const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const g = c.getContext("2d");
      const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#060b18"); gr.addColorStop(0.6, "#152341"); gr.addColorStop(0.82, "#3a2a3c"); gr.addColorStop(1, "#1a1018"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
      for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(220,230,255,${(rnd() * 0.5).toFixed(2)})`; g.fillRect(rnd() * 1024, rnd() * 260, 1, 1); }
      g.fillStyle = "#05060a"; let x = 0; while (x < 1024) { const w = 60 + rnd() * 120, h = 60 + rnd() * 130; g.fillRect(x, 512 - h, w, h); for (let k = 0; k < 6; k++) if (rnd() < 0.5) { g.fillStyle = rnd() < 0.7 ? "rgba(255,200,120,0.55)" : "rgba(160,220,255,0.5)"; g.fillRect(x + 8 + rnd() * (w - 20), 512 - h + 10 + rnd() * (h - 30), 6, 8); g.fillStyle = "#05060a"; } x += w + 4; }
      const poles = [140, 470, 820]; g.strokeStyle = "#020305"; g.fillStyle = "#020305";
      for (const px of poles) { g.fillRect(px - 5, 70, 10, 442); for (const y of [100, 130]) g.fillRect(px - 60, y, 120, 6); g.fillRect(px - 18, 160, 36, 22); }
      g.lineWidth = 2;
      for (let w = 0; w < 7; w++) { const y = 100 + (w % 4) * 10 + (w > 3 ? 30 : 0); g.beginPath(); g.moveTo(-20, y + 30); for (let i = 0; i < poles.length; i++) { const a = i ? poles[i - 1] : -20, b = poles[i]; g.quadraticCurveTo((a + b) / 2, y + 26 + rnd() * 18, b + (w % 3 - 1) * 40, y); } g.quadraticCurveTo(940, y + 30, 1044, y + 10); g.stroke(); }
      return keep(new T.CanvasTexture(c));
    })();
    add(new T.PlaneGeometry(9, 4.5), keep(new T.MeshBasicMaterial({ map: sky, fog: false })), WX + 3.2, 1.9, -0.3, -Math.PI / 2);
    const frameMat = keep(new T.MeshStandardMaterial({ color: "#2a2d33", roughness: 0.6, metalness: 0.3 }));
    for (const [y, h] of [[WY0, 0.06], [WY1, 0.06], [(WY0 + WY1) / 2, 0.035]]) add(new T.BoxGeometry(0.08, h, WZ1 - WZ0), frameMat, WX - 0.02, y, (WZ0 + WZ1) / 2);
    for (const z of [WZ0, WZ1, (WZ0 + WZ1) / 2]) add(new T.BoxGeometry(0.08, WY1 - WY0, 0.05), frameMat, WX - 0.02, (WY0 + WY1) / 2, z);
    // a mesa comprida encostada na parede do fundo
    const deskMat = keep(new T.MeshStandardMaterial({ color: "#2b2620", roughness: 0.7 }));
    add(new T.BoxGeometry(3.8, 0.05, 0.95), deskMat, 0, 0.75, -RZ + 0.55);
    for (const x of [-1.8, 1.8]) for (const z of [-RZ + 0.15, -RZ + 0.95]) add(new T.BoxGeometry(0.05, 0.75, 0.05), deskMat, x, 0.375, z);
    add(new T.BoxGeometry(0.62, 0.03, 0.2), keep(new T.MeshStandardMaterial({ color: "#c9c3b4", roughness: 0.6 })), 0, 0.79, -RZ + 1.0, 0.04);

    /* ---------------- luz ---------------- */
    scene.add(new T.AmbientLight("#2a3c58", 1.05));
    const moon = new T.DirectionalLight("#5a74b0", 0.6); moon.position.set(8, 4, -1); scene.add(moon);
    const bulb = new T.PointLight("#ff8a4a", 0.25, 6, 2); bulb.position.set(RX + 1, 1.2, 0); scene.add(bulb);

    /* ---------------- as telas ---------------- */
    const subjects = ctx.subjects().filter((s) => s.cat === "curso-tecnico");
    const PH = "#86f7e0";
    function screenTex(title, sub, lines) {
      const c = document.createElement("canvas"); c.width = 512; c.height = 384; const g = c.getContext("2d"); const tex = keep(new T.CanvasTexture(c));
      const draw = (blink) => {
        g.fillStyle = "#03110f"; g.fillRect(0, 0, 512, 384);
        const gr = g.createRadialGradient(256, 192, 40, 256, 192, 330); gr.addColorStop(0, "rgba(40,120,110,0.35)"); gr.addColorStop(1, "rgba(0,0,0,0.6)"); g.fillStyle = gr; g.fillRect(0, 0, 512, 384);
        g.fillStyle = PH; g.font = "600 30px 'Geist Mono', monospace"; g.fillText(title.length > 24 ? title.slice(0, 23) + "…" : title, 30, 62);
        g.fillStyle = "rgba(134,247,224,0.55)"; g.font = "500 15px 'Geist Mono', monospace"; g.fillText(sub.toUpperCase(), 30, 92);
        g.fillRect(30, 108, 452, 2);
        g.fillStyle = PH; g.font = "500 18px 'Geist Mono', monospace";
        lines.slice(0, 7).forEach((l, i) => g.fillText((l.length > 38 ? l.slice(0, 37) + "…" : l), 30, 146 + i * 30));
        if (blink) g.fillRect(30, 146 + Math.min(7, lines.length) * 30 - 16, 12, 20);
        for (let y = 0; y < 384; y += 3) { g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(0, y, 512, 1); }
        tex.needsUpdate = true;
      };
      draw(true); return { tex, draw };
    }
    function noiseTex() { const c = document.createElement("canvas"); c.width = 96; c.height = 72; const g = c.getContext("2d"); const tex = keep(new T.CanvasTexture(c)); tex.magFilter = T.NearestFilter; const draw = () => { const d = g.createImageData(96, 72); for (let i = 0; i < d.data.length; i += 4) { const v = rnd() * 150; d.data[i] = v * 0.8; d.data[i + 1] = v; d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); tex.needsUpdate = true; }; draw(); return { tex, draw }; }
    const SCREEN_FS = `uniform sampler2D map; uniform float uT, uHot, uSeed; varying vec2 vUv;
      void main(){ vec2 uv = vUv - 0.5; float r = dot(uv, uv); uv *= 1.0 + r * 0.18; uv += 0.5;
        float wob = sin(uT * 1.7 + uSeed) * 0.0015; vec3 c = texture2D(map, uv + vec2(wob, 0.0)).rgb;
        c *= 0.9 + 0.1 * sin(uv.y * 700.0 - uT * 12.0); c *= 0.94 + 0.06 * sin(uT * 31.0 + uSeed);
        float band = smoothstep(0.0, 0.08, fract(uv.y * 0.6 - uT * 0.12)) * 0.08; c += vec3(0.4, 1.0, 0.9) * band * 0.15;
        float edge = smoothstep(0.5, 0.42, max(abs(uv.x - 0.5), abs(uv.y - 0.5))); c *= edge;
        c *= 1.0 + uHot * 0.5; gl_FragColor = vec4(c * 1.25, 1.0); }`;
    const screenMat = (tex, seed) => keep(new T.ShaderMaterial({ uniforms: { map: { value: tex }, uT: { value: 0 }, uHot: { value: 0 }, uSeed: { value: seed } }, vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: SCREEN_FS }));

    /* ---------------- os monitores ---------------- */
    const loader = new T.GLTFLoader();
    const load = (f) => new Promise((ok) => loader.load(base + f, (g) => ok(g), undefined, () => ok(null)));
    const monitors = [], statics = [];
    const MON = [
      { at: [0, 0.775, -RZ + 0.42], h: 0.62, ry: 0, main: true },
      { at: [-1.2, 0.775, -RZ + 0.45], h: 0.48, ry: 0.28 }, { at: [-1.15, 1.255, -RZ + 0.4], h: 0.42, ry: 0.2 },
      { at: [1.2, 0.775, -RZ + 0.45], h: 0.48, ry: -0.28 }, { at: [1.15, 1.255, -RZ + 0.4], h: 0.42, ry: -0.2 },
      { at: [2.55, 0, -RZ + 1.1], h: 0.55, ry: -0.75 },
    ];
    const DEAD = [{ at: [-2.6, 0, -RZ + 0.9], h: 0.5, ry: 0.6 }, { at: [-3.9, 0, -0.8], h: 0.46, ry: 1.35 }, { at: [-3.85, 0.46, -0.85], h: 0.38, ry: 1.2 }, { at: [3.7, 0, 2.2], h: 0.42, ry: -2.3 }, { at: [-2.1, 0, 2.6], h: 0.4, ry: 2.6 }];
    const crtGroup = (src, o) => {
      const root = src.clone(true), box = new T.Box3().setFromObject(root), sz = box.getSize(new T.Vector3()), s = o.h / sz.y;
      root.scale.setScalar(s); root.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, -(box.min.z + box.max.z) / 2 * s);
      root.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color = new T.Color("#d8d2c4"); m.material.roughness = 0.7; } });
      const g = new T.Group(); g.add(root); g.position.set(...o.at); g.rotation.y = -Math.PI / 2 + o.ry; scene.add(g);
      // a tela (o modelo olha para +x; a tela fica no vão da frente)
      const off = V3((0.8 - (box.min.x + box.max.x) / 2) * s + 0.012, 2.77 * s, -((box.min.z + box.max.z) / 2 - (-0.03)) * s);
      return { g, s, off, w: 3.4 * s, hgt: 2.35 * s };
    };
    load("crt.glb").then((gl) => {
      if (!gl) return;
      MON.forEach((o, k) => {
        const m = crtGroup(gl.scene, o);
        const sj = o.main ? null : subjects[(k - 1) % Math.max(1, subjects.length)];
        const st = o.main ? screenTex("Área técnica", "curso técnico · sesi senai", subjects.map((x) => "> " + x.name)) : screenTex(sj ? sj.name : "sem sinal", sj ? (sj.acts.length + (sj.acts.length === 1 ? " atividade" : " atividades")) : "", sj ? sj.acts.map((a) => "- " + a.t) : []);
        const mat = screenMat(st.tex, k * 1.7);
        const pl = new T.Mesh(keep(new T.PlaneGeometry(m.w, m.hgt)), mat); pl.position.copy(m.off); pl.rotation.y = Math.PI / 2; m.g.add(pl);
        const glow = new T.Sprite(keep(new T.SpriteMaterial({ map: ctx.glowTex, color: "#5fe8d0", transparent: true, opacity: 0.22, depthWrite: false, blending: T.AdditiveBlending }))); glow.scale.set(m.w * 2.2, m.hgt * 2.2, 1); glow.position.copy(m.off).add(V3(0.15, 0, 0)); m.g.add(glow);
        const light = new T.PointLight("#62e6d2", o.main ? 1.1 : 0.55, 3.2, 2); light.position.copy(m.off).add(V3(0.35, 0, 0)); m.g.add(light);
        m.g.updateMatrixWorld(true);
        const c = pl.getWorldPosition(new T.Vector3()), n = V3(1, 0, 0).applyQuaternion(m.g.quaternion);
        monitors.push({ ...m, pl, mat, st, sj, main: !!o.main, c, n, light, glow, hot: 0 });
      });
      DEAD.forEach((o, k) => {
        const m = crtGroup(gl.scene, o), nt = noiseTex();
        const mat = screenMat(nt.tex, 9 + k); const pl = new T.Mesh(keep(new T.PlaneGeometry(m.w, m.hgt)), mat); pl.position.copy(m.off); pl.rotation.y = Math.PI / 2; m.g.add(pl);
        const light = new T.PointLight("#9fb4c8", 0.18, 2.2, 2); light.position.copy(m.off).add(V3(0.3, 0, 0)); m.g.add(light);
        statics.push({ nt, mat });
      });
      cables();
    });

    /* ---------------- os fios: saem dos monitores, correm pelo chão e sobem pelas paredes ---------------- */
    const cableMat = keep(new T.MeshStandardMaterial({ color: "#0c0d10", roughness: 0.45, metalness: 0.2 }));
    const cableMat2 = keep(new T.MeshStandardMaterial({ color: "#2a1414", roughness: 0.5 }));
    function tube(pts, r, mat) { const curve = new T.CatmullRomCurve3(pts, false, "centripetal"); const m = new T.Mesh(keep(new T.TubeGeometry(curve, Math.max(24, pts.length * 14), r, 5, false)), mat); scene.add(m); }
    function cables() {
      const srcs = monitors.concat(statics.length ? [] : []).map((m) => m.g.position.clone().add(V3(0, 0.15, -0.12)));
      for (let i = 0; i < 46; i++) {
        const a = srcs[i % srcs.length].clone().add(V3((rnd() - 0.5) * 0.3, rnd() * 0.2, -0.05));
        const pts = [a, V3(a.x + (rnd() - 0.5) * 0.4, Math.max(0.02, a.y - 0.6), a.z - 0.08)];
        let p = V3(a.x + (rnd() - 0.5) * 1.2, 0.02, a.z + 0.3 + rnd() * 0.6); pts.push(p);
        const n = 2 + Math.floor(rnd() * 3); for (let k = 0; k < n; k++) { p = V3(Math.max(-RX + 0.2, Math.min(RX - 0.2, p.x + (rnd() - 0.5) * 3.2)), 0.015 + rnd() * 0.02, Math.max(-RZ + 0.2, Math.min(RZ - 0.3, p.z + (rnd() - 0.2) * 2.4))); pts.push(p); }
        const wall = rnd(); // sobe pela parede mais perto ou some no rodapé
        if (wall < 0.55) { const toX = Math.abs(p.x) > Math.abs(p.z) * 1.2; const q = toX ? V3(Math.sign(p.x) * (RX - 0.04), 0.03, p.z) : V3(p.x, 0.03, -RZ + 0.04); pts.push(q, q.clone().setY(0.9 + rnd() * 1.4), q.clone().setY(RHt - 0.03).add(toX ? V3(0, 0, (rnd() - 0.5) * 0.8) : V3((rnd() - 0.5) * 0.8, 0, 0))); }
        tube(pts, 0.008 + rnd() * 0.016, rnd() < 0.12 ? cableMat2 : cableMat);
      }
      // fios pendurados no teto, fazendo barriga
      for (let i = 0; i < 16; i++) { const a = V3((rnd() - 0.5) * 2 * RX * 0.9, RHt - 0.02, (rnd() - 0.5) * 2 * RZ * 0.9), b = V3(a.x + (rnd() - 0.5) * 3, RHt - 0.02, a.z + (rnd() - 0.5) * 3), m = a.clone().lerp(b, 0.5).setY(RHt - 0.4 - rnd() * 0.7); tube([a, a.clone().lerp(m, 0.5).setY(RHt - 0.25 - rnd() * 0.2), m, b.clone().lerp(m, 0.5).setY(RHt - 0.25 - rnd() * 0.2), b], 0.01 + rnd() * 0.012, cableMat); }
    }

    let mixer = null;

    /* ---------------- o zumbido ---------------- */
    let audio = null;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; const ac = new AC(); const out = ac.createGain(); out.gain.value = 0; out.connect(ac.destination);
      const hum = (f, type, v) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v; o.connect(g).connect(out); o.start(); return o; };
      const oscs = [hum(50, "sine", 0.05), hum(100, "sine", 0.025), hum(150, "triangle", 0.008), hum(15734, "sine", 0.0016)];
      const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const ns = ac.createBufferSource(); ns.buffer = nb; ns.loop = true; const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 180; bp.Q.value = 0.8; const ng = ac.createGain(); ng.gain.value = 0.018; ns.connect(bp).connect(ng).connect(out); ns.start();
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.13; lg.gain.value = 0.06; lfo.connect(lg).connect(out.gain); lfo.start();
      out.gain.linearRampToValueAtTime(0.32, ac.currentTime + 2.0);
      audio = { ac, out, stop: () => { try { out.gain.cancelScheduledValues(ac.currentTime); out.gain.setValueAtTime(out.gain.value, ac.currentTime); out.gain.linearRampToValueAtTime(0, ac.currentTime + 0.6); setTimeout(() => { oscs.concat([ns, lfo]).forEach((o) => { try { o.stop(); } catch (e) { /* já parou */ } }); ac.close(); }, 800); } catch (e) { /* sem som */ } } };
    } catch (e) { audio = null; }

    /* ---------------- câmera ---------------- */
    const OVER = { pos: V3(1.9, 1.62, 2.6), tgt: V3(-0.15, 1.05, -RZ + 0.3) };
    const cam = { pos: OVER.pos.clone(), tgt: OVER.tgt.clone(), yaw: 0, pitch: 0, yawT: 0, pitchT: 0 };
    let glide = null, focus = null;
    const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
    function to(pose, dur = 1.8) { if (ctx.reduce) { cam.pos.copy(pose.pos); cam.tgt.copy(pose.tgt); return; } glide = { p0: cam.pos.clone(), t0: cam.tgt.clone(), p1: pose.pos.clone(), t1: pose.tgt.clone(), u: 0, dur }; cam.yawT = cam.pitchT = 0; }
    function openMon(m) {
      // a câmera fica de frente para a tela, com ela um pouco à esquerda (o painel abre à direita)
      focus = m; const d = 1.05 + m.hgt * 2.2, right = V3(m.n.z, 0, -m.n.x).multiplyScalar(innerWidth > 760 ? m.w * 0.55 : 0);
      to({ pos: m.c.clone().addScaledVector(m.n, d).add(V3(0, 0.05, 0)).add(right), tgt: m.c.clone().add(right) });
      if (m.main) ctx.showPanel("Área técnica", "O curso técnico", `<p>Ensino Médio integrado ao Técnico em Análise e Desenvolvimento de Sistemas, no SESI SENAI. Cada monitor deste quarto guarda uma matéria do curso.</p><div class="links">${subjects.map((s) => `<a href="#" data-sala="${ctx.esc(s.name)}">${ctx.esc(s.name)}</a>`).join("")}</div>`);
      else if (m.sj) ctx.showPanel("Área técnica", m.sj.name, `<p>${ctx.esc(m.sj.desc || "")}</p><div class="links">${m.sj.acts.map((a, i) => `<a href="#" data-ativ="${ctx.esc(m.sj.name)}|${i}">${ctx.esc(a.t)}</a>`).join("")}</div>`);
    }

    /* ---------------- o que o resto da biblioteca usa ---------------- */
    const ray = new T.Raycaster();
    let blinkT = 0, noiseT = 0;
    return {
      name: "Área técnica", sub: "o quarto dos fios",
      update(dt, t) {
        if (glide) { glide.u = Math.min(1, glide.u + dt / glide.dur); const e = smoother(glide.u); cam.pos.lerpVectors(glide.p0, glide.p1, e); cam.tgt.lerpVectors(glide.t0, glide.t1, e); if (glide.u >= 1) glide = null; }
        const k = 1 - Math.exp(-dt * 3.5); cam.yaw += (cam.yawT - cam.yaw) * k; cam.pitch += (cam.pitchT - cam.pitch) * k;
        const d = cam.tgt.clone().sub(cam.pos), r = d.length(), yw = Math.atan2(d.z, d.x) + cam.yaw, pt = Math.asin(Math.max(-0.99, Math.min(0.99, d.y / r))) + cam.pitch;
        camera.position.copy(cam.pos).add(V3(0, Math.sin(t * 0.5) * 0.01, 0));
        camera.lookAt(cam.pos.x + Math.cos(yw) * Math.cos(pt), cam.pos.y + Math.sin(pt), cam.pos.z + Math.sin(yw) * Math.cos(pt));
        if (mixer) mixer.update(dt);
        blinkT += dt; if (blinkT > 0.55) { blinkT = 0; const on = Math.floor(t / 0.55) % 2 === 0; monitors.forEach((m) => m.st.draw(on)); }
        noiseT += dt; if (noiseT > 0.08) { noiseT = 0; statics.forEach((s) => s.nt.draw()); }
        for (const m of monitors) { m.hot += ((hot === m || focus === m ? 1 : 0) - m.hot) * Math.min(1, dt * 6); m.mat.uniforms.uT.value = t; m.mat.uniforms.uHot.value = m.hot; m.light.intensity = (m.main ? 1.1 : 0.55) * (0.92 + 0.08 * Math.sin(t * 23 + m.c.x * 5)) * (1 + m.hot * 0.6); }
        for (const s of statics) s.mat.uniforms.uT.value = t;
      },
      render(renderer) { renderer.setRenderTarget(null); renderer.render(scene, camera); },
      resize(w, h) { camera.aspect = w / h; camera.fov = w / h < 0.8 ? 74 : 58; camera.updateProjectionMatrix(); },
      pick(ndc) { ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(monitors.map((m) => m.pl), false); const m = hits[0] && monitors.find((x) => x.pl === hits[0].object); hot = m || null; return m ? { label: m.main ? ["Área técnica", "o curso inteiro"] : [m.sj ? m.sj.name : "Sem sinal", m.sj ? "ver as atividades" : ""], go: () => openMon(m) } : null; },
      look(dx, dy) { if (glide) return; cam.yawT = Math.max(-0.9, Math.min(0.9, cam.yawT - dx * 0.003)); cam.pitchT = Math.max(-0.35, Math.min(0.35, cam.pitchT - dy * 0.003)); },
      back() { if (focus) { focus = null; to(OVER); return true; } return false; },
      places() { return [{ id: "geral", t: "O quarto" }].concat(monitors.filter((m) => m.sj).map((m, i) => ({ id: "m" + i, t: m.sj.name }))); },
      dispose() { if (audio) audio.stop(); disposables.forEach((o) => o.dispose && o.dispose()); scene.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); }); },
    };
  };
})();
