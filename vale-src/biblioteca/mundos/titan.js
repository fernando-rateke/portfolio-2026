/* Mundo das Perspectivas para o futuro: Attack on Titan. O alto da muralha ao pôr do sol: o caminho de pedra
   com os canhões nos trilhos, uma bandeira com um emblema original batendo no vento, um viajante de capa
   sentado na beirada (personagem original), de costas, olhando para fora. Lá embaixo, os campos, a floresta, o rio, os
   titãs andando devagar, e no fim do horizonte o mar brilhando, o lugar que eles sonhavam ver. Cada
   perspectiva fica num ponto da muralha. Tudo desenhado aqui. */
(() => {
  window.MUNDOS = window.MUNDOS || {};
  window.MUNDOS.titan = (ctx) => {
    const T = ctx.T, V3 = (x, y, z) => new T.Vector3(x, y, z), small = ctx.small;
    let seed = 29; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const keep = []; const K = (o) => { keep.push(o); return o; };
    const scene = new T.Scene(); scene.fog = new T.FogExp2("#d8946a", 0.0011);
    const camera = new T.PerspectiveCamera(52, ctx.aspect(), 0.05, 2500);
    const WH = 50, OVERP = V3(0.6, WH + 2.2, 3.6), OVERT = V3(3.4, WH - 3.0, -40);
    const uT = { value: 0 };
    const SUN = V3(0.2, 0.08, -1).normalize();
    const std = (col, o = {}) => K(new T.MeshStandardMaterial(Object.assign({ color: col, roughness: 0.85 }, o)));
    const add = (geo, mat, x, y, z, ry = 0, rx = 0, rz = 0, parent) => { const m = new T.Mesh(K(geo), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); (parent || scene).add(m); return m; };

    /* ---------------- o céu e o mar no horizonte ---------------- */
    scene.add(new T.Mesh(K(new T.SphereGeometry(2000, 40, 20)), K(new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { uT, uS: { value: SUN } },
      vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform float uT; uniform vec3 uS; varying vec3 vD; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); } float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main(){ vec3 d = normalize(vD); float y = d.y; vec3 c = mix(vec3(1.0, 0.7, 0.45), vec3(0.95, 0.55, 0.4), smoothstep(0.0, 0.12, y)); c = mix(c, vec3(0.4, 0.5, 0.75), smoothstep(0.1, 0.65, y));
          float s = max(dot(d, uS), 0.0); c += vec3(1.0, 0.8, 0.5) * pow(s, 10.0) * 0.7 + vec3(1.0, 0.96, 0.85) * smoothstep(0.998, 0.9993, s);
          vec2 q = d.xz / max(y + 0.12, 0.05); float cl = n(q * 1.0 + vec2(uT * 0.004, 0.0)) * 0.6 + n(q * 2.7) * 0.4; c = mix(c, mix(vec3(1.0, 0.75, 0.6), vec3(0.75, 0.55, 0.6), smoothstep(0.0, 0.3, y)), smoothstep(0.55, 0.78, cl) * smoothstep(0.02, 0.12, y) * 0.8);
          gl_FragColor = vec4(c, 1.0); }` }))));
    scene.add(new T.HemisphereLight("#ffc8a0", "#4a3a30", 0.9)); const sun = new T.DirectionalLight("#ffb880", 1.5); sun.position.copy(SUN).multiplyScalar(300).add(V3(0, 80, 0)); scene.add(sun);

    /* ---------------- a terra lá embaixo: campos, floresta, rio e o mar ---------------- */
    const land = add(new T.PlaneGeometry(4000, 4000), K(new T.ShaderMaterial({ fog: true, uniforms: Object.assign({ uT, uS: { value: SUN } }, T.UniformsLib.fog),
      vertexShader: `varying vec3 vW; ${"\n" + T.ShaderChunk.fog_pars_vertex + "\n"} void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition; ${"\n" + T.ShaderChunk.fog_vertex + "\n"} }`,
      fragmentShader: `uniform float uT; uniform vec3 uS; varying vec3 vW; ${"\n" + T.ShaderChunk.fog_pars_fragment + "\n"} float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); } float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main(){ vec2 p = vW.xz; float fields = n(floor(p / 22.0) * 1.3); vec3 c = mix(vec3(0.42, 0.5, 0.25), vec3(0.62, 0.55, 0.3), fields); c = mix(c, vec3(0.18, 0.3, 0.16), smoothstep(0.55, 0.7, n(p * 0.012)));
          float river = smoothstep(9.0, 3.0, abs(p.x - 60.0 + sin(p.y * 0.01) * 90.0)) * step(p.y, 0.0); float sea = smoothstep(-650.0, -760.0, p.y);
          vec3 V = normalize(cameraPosition - vW); vec3 R = reflect(-V, vec3(0, 1, 0)); float spec = pow(max(dot(R, uS), 0.0), 40.0);
          vec3 water = mix(vec3(0.5, 0.55, 0.65), vec3(1.0, 0.85, 0.6), spec);
          c = mix(c, water, max(river, sea)); gl_FragColor = vec4(c, 1.0); ${"\n" + T.ShaderChunk.fog_fragment + "\n"} }` })), 0, 0, 0, 0, -Math.PI / 2);
    // árvores da floresta (bolinhas escuras) e as casas do lado de dentro
    { const N = small ? 600 : 1400, im = new T.InstancedMesh(K(new T.IcosahedronGeometry(1, 0)), std("#2a4a28"), N), m = new T.Matrix4(), q = new T.Quaternion(); let k = 0; while (k < N) { const x = (rnd() - 0.5) * 900, z = -40 - rnd() * 900; if (z > -70 || z < -620 || (rnd() < 0.5 && Math.abs(x - 200) > 250)) continue; const s = 2.2 + rnd() * 3; m.compose(V3(x, s * 0.8, z), q, V3(s, s * 1.3, s)); im.setMatrixAt(k++, m); } scene.add(im); }
    { const N = 260, im = new T.InstancedMesh(K(new T.BoxGeometry(1, 1, 1)), std("#b8a080"), N), rf = new T.InstancedMesh(K(new T.ConeGeometry(0.8, 0.6, 4)), std("#8a4a32"), N), m = new T.Matrix4(), q = new T.Quaternion();
      for (let i = 0; i < N; i++) { const x = (rnd() - 0.5) * 500, z = 40 + rnd() * 400, w = 6 + rnd() * 6; q.setFromAxisAngle(V3(0, 1, 0), rnd() * 3); m.compose(V3(x, w * 0.4, z), q, V3(w, w * 0.8, w)); im.setMatrixAt(i, m); m.compose(V3(x, w * 0.8 + w * 0.3, z), q.clone().multiply(new T.Quaternion().setFromAxisAngle(V3(0, 1, 0), Math.PI / 4)), V3(w, w, w)); rf.setMatrixAt(i, m); } scene.add(im, rf); }
    // os titãs andando lá fora, devagar
    const titans = [];
    for (let i = 0; i < 9; i++) { const g = new T.Group(); const hgt = 7 + rnd() * 9; const sk = std(["#d8a888", "#c89878", "#e0b898"][i % 3]); g.add(add(new T.CapsuleGeometry(hgt * 0.16, hgt * 0.45, 5, 10), sk, 0, hgt * 0.55, 0));
      g.add(add(new T.SphereGeometry(hgt * 0.13, 14, 10), sk, 0, hgt * 0.97, 0)); for (const s of [-1, 1]) { g.add(add(new T.CapsuleGeometry(hgt * 0.06, hgt * 0.36, 4, 8), sk, s * hgt * 0.08, hgt * 0.2, 0)); g.add(add(new T.CapsuleGeometry(hgt * 0.05, hgt * 0.34, 4, 8), sk, s * hgt * 0.22, hgt * 0.58, 0, 0, 0, s * 0.15)); }
      const x = -300 + rnd() * 600, z = -80 - rnd() * 500; g.position.set(x, 0, z); scene.add(g); titans.push({ g, x, z, sp: 0.5 + rnd() * 0.8, dir: rnd() * 6.28, ph: rnd() * 6 }); }

    /* ---------------- a muralha ---------------- */
    const stone = std("#a8988a", { roughness: 0.95 }), stoneD = std("#7a6e64", { roughness: 0.95 });
    const wallFace = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#9a8a7c"; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < 256; x += 64) { g.fillStyle = `rgba(0,0,0,${0.05 + rnd() * 0.12})`; g.fillRect(x + 1, y + 1, 62, 30); g.strokeStyle = "rgba(40,30,24,0.6)"; g.lineWidth = 2; g.strokeRect(x, y, 64, 32); } const t = K(new T.CanvasTexture(c)); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(60, 8); return t; })();
    add(new T.BoxGeometry(800, WH, 12), std("#ffffff", { map: wallFace }), 0, WH / 2, 6); // o corpo da muralha (a face de fora em z = 0)
    add(new T.BoxGeometry(800, 0.2, 12), stoneD, 0, WH + 0.1, 6);
    for (let x = -60; x < 60; x += 3.2) add(new T.BoxGeometry(2.2, 0.6, 0.6), stone, x, WH + 0.5, 0.35); // ameias na beirada de fora
    // os canhões nos trilhos
    const cannons = [];
    for (const x of [6, 16, 26]) { const g = new T.Group(); g.position.set(x, WH + 0.2, 3.2); scene.add(g); add(new T.BoxGeometry(3.4, 0.12, 0.5), std("#5a4a3a"), 0, 0.06, 0, Math.PI / 2, 0, 0, g);
      add(new T.BoxGeometry(1.2, 0.5, 1.4), std("#5a4030"), 0, 0.4, 0, 0, 0, 0, g); for (const s of [-1, 1]) add(new T.CylinderGeometry(0.35, 0.35, 0.12, 14), std("#3a3028"), s * 0.65, 0.35, 0, 0, 0, Math.PI / 2, g);
      add(new T.CylinderGeometry(0.22, 0.3, 2.2, 14), std("#2a2a2e", { metalness: 0.7, roughness: 0.4 }), 0, 0.85, -0.7, 0, Math.PI / 2 - 0.1, 0, g); cannons.push(g); }
    // a bandeira, com um emblema original
    const flagTex = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#3a2a4a"; g.fillRect(0, 0, 256, 256); g.translate(128, 140);
      // emblema original: um portão aberto com um sol nascendo entre as duas folhas
      g.fillStyle = "#f2c25a"; g.beginPath(); g.arc(0, 10, 34, Math.PI, 0); g.fill(); for (let k = 0; k < 9; k++) { const a = Math.PI + k * Math.PI / 8; g.fillRect(Math.cos(a) * 44 - 3, 10 + Math.sin(a) * 44 - 3, 6, 6); }
      g.fillStyle = "#e8e4da"; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 18, 60); g.lineTo(sd * 70, 40); g.lineTo(sd * 70, -60); g.lineTo(sd * 18, -40); g.closePath(); g.fill(); }
      g.fillStyle = "#3a2a4a"; for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) g.fillRect(sd * 44 - 2, -30 + k * 28, 4, 18); return K(new T.CanvasTexture(c)); })();
    const FLAG = V3(-5.0, WH + 0.2, 1.6);
    add(new T.CylinderGeometry(0.06, 0.08, 6, 8), std("#5a4a3a"), FLAG.x, FLAG.y + 3, FLAG.z);
    const flagGeo = K(new T.PlaneGeometry(2.4, 2.4, 16, 8)); const flag = add(flagGeo, std("#ffffff", { map: flagTex, side: T.DoubleSide, roughness: 0.9 }), FLAG.x + 1.2, FLAG.y + 4.7, FLAG.z, -0.6);
    const flagBase = flagGeo.attributes.position.array.slice();
    // o viajante sentado na beirada, de costas, com a capa marrom
    const soldier = new T.Group(); soldier.position.set(2.4, WH + 0.32, 0.25); soldier.rotation.y = 0.2; scene.add(soldier);
    { const cloak = std("#5a4632", { side: T.DoubleSide }), skin = std("#e8c8b0"), boots = std("#3a2a20"), white = std("#e8e4da"), metal = std("#8a8a90", { metalness: 0.8, roughness: 0.3 }), hair = std("#2a2220");
      add(new T.CapsuleGeometry(0.17, 0.4, 6, 12), white, 0, 0.35, 0, 0, 0, 0, soldier);
      for (const s of [-1, 1]) { add(new T.CapsuleGeometry(0.075, 0.38, 5, 10), white, s * 0.1, 0.02, -0.22, Math.PI / 2, 0, 0, soldier); add(new T.CapsuleGeometry(0.07, 0.36, 5, 10), boots, s * 0.1, -0.3, -0.45, 0, 0, 0, soldier);
        add(new T.BoxGeometry(0.14, 0.18, 0.1), std("#6a4a2a"), s * 0.22, 0.25, 0.02, 0, 0, 0, soldier); }
      add(new T.SphereGeometry(0.12, 16, 12), skin, 0, 0.85, -0.02, 0, 0, 0, soldier); add(new T.SphereGeometry(0.125, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), hair, 0, 0.87, 0.01, 0, 0, 0, soldier);
      const cl = add(new T.PlaneGeometry(0.7, 0.85, 6, 6), cloak, 0, 0.42, 0.2, 0, 0.15, 0, soldier); soldier.userData.cloak = cl; soldier.userData.cloakBase = cl.geometry.attributes.position.array.slice();
      const em = new T.Mesh(K(new T.PlaneGeometry(0.34, 0.34)), K(new T.MeshStandardMaterial({ map: flagTex, transparent: true, side: T.DoubleSide }))); em.position.set(0, 0.48, 0.36); em.rotation.x = 0.1; soldier.add(em); }
    // gaivotas
    const birds = []; for (let i = 0; i < 10; i++) { const b = new T.Group(); for (const s of [-1, 1]) { const w = new T.Mesh(K(new T.PlaneGeometry(0.9, 0.18)), std("#f4f0ea", { side: T.DoubleSide })); w.position.x = s * 0.45; b.add(w); } b.scale.setScalar(1.2); scene.add(b); birds.push({ b, ph: rnd() * 6, r: 20 + rnd() * 30, h: WH + 6 + rnd() * 15, sp: 0.15 + rnd() * 0.15 }); }

    /* ---------------- as perspectivas ---------------- */
    const tx = ctx.textos ? ctx.textos() : { futuro: [] };
    const list = tx.futuro && tx.futuro.length ? tx.futuro : [{ t: "Perspectivas para o futuro", s: "em breve", r: "Este texto ainda vai ser escrito." }];
    const sub = { name: "Perspectivas para o futuro", acts: list.map((a) => Object.assign({ k: [], l: [] }, a)) };
    const SPOTS = [{ at: V3(2.4, WH + 0.9, 0.3), name: "o viajante na beirada" }, { at: V3(6, WH + 1.1, 3.2), name: "o canhão" }, { at: FLAG.clone().add(V3(0.6, 2.5, 0)), name: "a bandeira" }, { at: V3(16, WH + 1.1, 3.2), name: "o segundo canhão" }, { at: V3(26, WH + 1.1, 3.2), name: "o terceiro canhão" }];
    const items = sub.acts.slice(0, SPOTS.length).map((a, i) => { const s = SPOTS[i]; const hit = add(new T.SphereGeometry(1.1, 8, 6), K(new T.MeshBasicMaterial()), s.at.x, s.at.y, s.at.z); hit.visible = false;
      const mk = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xffd090, transparent: true, opacity: 0.6, depthWrite: false, blending: T.AdditiveBlending }))); mk.scale.setScalar(0.8); mk.position.copy(s.at).add(V3(0, 1.2, 0)); scene.add(mk); return { a, i, hit, mk, s, hot: 0 }; });

    /* ---------------- o som: vento, a bandeira, passos de titã ao longe ---------------- */
    let audio = null;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)(), out = ac.createGain(); out.gain.value = 0; out.connect(ac.destination); const nodes = [];
      const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      for (const [f, q, gv] of [[400, 0.5, 0.09], [1200, 1.5, 0.02]]) { const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; const bq = ac.createBiquadFilter(); bq.type = "bandpass"; bq.frequency.value = f; bq.Q.value = q; const g = ac.createGain(); g.gain.value = gv; const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.1 + Math.random() * 0.1; lg.gain.value = gv * 0.6; lfo.connect(lg).connect(g.gain); s.connect(bq).connect(g).connect(out); s.start(); lfo.start(); nodes.push(s, lfo); }
      const thud = () => { if (!audio) return; const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(55, t0); o.frequency.exponentialRampToValueAtTime(28, t0 + 0.5); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7); o.connect(g).connect(out); o.start(t0); o.stop(t0 + 0.75); setTimeout(thud, 1800 + Math.random() * 5000); }; setTimeout(thud, 2500);
      const gull = () => { if (!audio) return; const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = "triangle"; o.frequency.setValueAtTime(1400, t0); o.frequency.exponentialRampToValueAtTime(900, t0 + 0.35); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.03, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4); o.connect(g).connect(out); o.start(t0); o.stop(t0 + 0.45); setTimeout(gull, 4000 + Math.random() * 8000); }; setTimeout(gull, 3500);
      out.gain.linearRampToValueAtTime(0.75, ac.currentTime + 2.5); audio = { ac, out, nodes };
    } catch (e) { audio = null; }

    /* ---------------- câmera ---------------- */
    const OVER = { pos: OVERP.clone(), tgt: OVERT.clone() };
    const cam = { pos: OVER.pos.clone(), tgt: OVER.tgt.clone(), yaw: 0, pitch: 0, yawT: 0, pitchT: 0 };
    let glide = null, focus = null, hot = null;
    const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
    function to(pose, dur = 2.0) { if (ctx.reduce) { cam.pos.copy(pose.pos); cam.tgt.copy(pose.tgt); return; } glide = { p0: cam.pos.clone(), t0: cam.tgt.clone(), p1: pose.pos.clone(), t1: pose.tgt.clone(), u: 0, dur }; cam.yawT = cam.pitchT = 0; }
    function openItem(it) { focus = it; const p = it.s.at; to({ pos: p.clone().add(V3(-2.6, 0.9, 3.4)), tgt: p.clone() }); setTimeout(() => { if (focus === it && ctx.openPages) ctx.openPages(sub, it.i); }, ctx.reduce ? 0 : 1500); }
    setTimeout(() => { try { ctx.toast("Attack on Titan", "O alto da muralha", "Do outro lado está o que vem depois. Cada ponto da muralha guarda uma perspectiva."); } catch (e) { /* sem aviso */ } }, 900);

    const ray = new T.Raycaster();
    const fx = ctx.fantasy(scene, { center: V3(3, WH + 2.2, -3), radius: 9, height: 3, colors: ["#ffd890", "#ff9ab8", "#9ad8ff"], count: 6, power: 1.2, dim: 0.75, motes: 260, moteSize: 0.03 });
    return {
      name: "O alto da muralha", sub: "Perspectivas para o futuro",
      update(dt, t) {
        fx.update(t);
        uT.value = t;
        if (glide) { glide.u = Math.min(1, glide.u + dt / glide.dur); const e = smoother(glide.u); cam.pos.lerpVectors(glide.p0, glide.p1, e); cam.tgt.lerpVectors(glide.t0, glide.t1, e); if (glide.u >= 1) glide = null; }
        const k = 1 - Math.exp(-dt * 3.5); cam.yaw += (cam.yawT - cam.yaw) * k; cam.pitch += (cam.pitchT - cam.pitch) * k;
        const d = cam.tgt.clone().sub(cam.pos), r = d.length(), yw = Math.atan2(d.z, d.x) + cam.yaw, pt = Math.asin(Math.max(-0.99, Math.min(0.99, d.y / r))) + cam.pitch;
        camera.position.copy(cam.pos).add(V3(0, Math.sin(t * 0.45) * 0.01, 0)); camera.lookAt(cam.pos.x + Math.cos(yw) * Math.cos(pt), cam.pos.y + Math.sin(pt), cam.pos.z + Math.sin(yw) * Math.cos(pt));
        // a bandeira e a capa batendo no vento
        { const p = flagGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = flagBase[i * 3], y = flagBase[i * 3 + 1], u = (x + 1.2) / 2.4; p.setZ(i, Math.sin(t * 5 + x * 3 + y) * 0.18 * u + Math.sin(t * 9 + x * 6) * 0.05 * u); } p.needsUpdate = true; flagGeo.computeVertexNormals(); }
        { const cl = soldier.userData.cloak, b = soldier.userData.cloakBase, p = cl.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const y = b[i * 3 + 1], x = b[i * 3]; const u = (0.425 - y) / 0.85; p.setZ(i, Math.sin(t * 4 + x * 5 + y * 3) * 0.06 * u + u * 0.12); } p.needsUpdate = true; }
        for (const ti of titans) { ti.dir += Math.sin(t * 0.05 + ti.ph) * 0.002; ti.x += Math.cos(ti.dir) * ti.sp * dt; ti.z += Math.sin(ti.dir) * ti.sp * dt; ti.g.position.set(ti.x, Math.abs(Math.sin(t * 0.8 + ti.ph)) * 0.4, ti.z); ti.g.rotation.y = -ti.dir + Math.PI / 2; }
        for (const b of birds) { const a = t * b.sp + b.ph; b.b.position.set(Math.cos(a) * b.r + 5, b.h + Math.sin(a * 2) * 2, Math.sin(a) * b.r - 25); b.b.rotation.y = -a; b.b.children.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * Math.sin(t * 6 + b.ph) * 0.4)); }
        for (const it of items) { it.hot += ((hot === it || focus === it ? 1 : 0) - it.hot) * Math.min(1, dt * 6); it.mk.material.opacity = 0.45 + 0.2 * Math.sin(t * 2 + it.i) + it.hot * 0.4; it.mk.scale.setScalar(0.8 + it.hot * 0.4); }
      },
      render(renderer) { renderer.setRenderTarget(null); renderer.render(scene, camera); },
      resize(w, h) { camera.aspect = w / h; const tall = w / h < 0.8; camera.fov = tall ? 72 : 52; camera.updateProjectionMatrix(); OVER.pos.copy(tall ? V3(-4.5, WH + 2.2, 8) : OVERP); if (!focus && !glide) cam.pos.copy(OVER.pos); },
      pick(ndc) { ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(items.map((x) => x.hit), false); const it = hits[0] && items.find((x) => x.hit === hits[0].object); hot = it || null; return it ? { label: [it.a.t, it.s.name], go: () => openItem(it) } : null; },
      look(dx, dy) { if (glide) return; cam.yawT = Math.max(-1.1, Math.min(1.1, cam.yawT - dx * 0.003)); cam.pitchT = Math.max(-0.5, Math.min(0.5, cam.pitchT - dy * 0.003)); },
      back() { if (focus) { focus = null; to(OVER); return true; } return false; },
      dispose() { if (audio) { const a = audio; audio = null; try { a.out.gain.linearRampToValueAtTime(0, a.ac.currentTime + 0.5); setTimeout(() => { a.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* já parou */ } }); a.ac.close(); }, 700); } catch (e) { /* sem som */ } } keep.forEach((o) => o.dispose && o.dispose()); },
    };
  };
})();
