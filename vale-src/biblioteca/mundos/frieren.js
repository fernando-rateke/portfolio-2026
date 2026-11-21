/* Mundo dos Agradecimentos, no clima de Frieren. Um campo de flores azuis da lua aberto numa noite de chuva de
   meteoros. No alto do morro, a estátua de um cavaleiro antigo coberta de musgo; no meio das flores, uma maga
   élfica viajante de costas, olhando o céu, com o cajado de cristal âmbar (personagens originais). Cada
   agradecimento é um tufo de flores que brilha mais forte. Tudo desenhado aqui. */
(() => {
  window.MUNDOS = window.MUNDOS || {};
  window.MUNDOS.frieren = (ctx) => {
    const T = ctx.T, V3 = (x, y, z) => new T.Vector3(x, y, z), small = ctx.small;
    let seed = 23; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const keep = []; const K = (o) => { keep.push(o); return o; };
    const scene = new T.Scene(); scene.fog = new T.FogExp2("#0c1430", 0.025);
    const camera = new T.PerspectiveCamera(52, ctx.aspect(), 0.05, 900);
    const OVERP = V3(0.4, 1.55, 7.2), OVERT = V3(-0.3, 2.6, -6);
    const uT = { value: 0 };
    const add = (geo, mat, x, y, z, ry = 0, rx = 0, rz = 0, parent) => { const m = new T.Mesh(K(geo), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); (parent || scene).add(m); return m; };
    const grad = (() => { const d = new Uint8Array([60, 60, 60, 255, 150, 150, 150, 255, 255, 255, 255, 255]); const t = K(new T.DataTexture(d, 3, 1)); t.minFilter = t.magFilter = T.NearestFilter; t.needsUpdate = true; return t; })();
    const toon = (col, o = {}) => K(new T.MeshToonMaterial(Object.assign({ color: col, gradientMap: grad }, o)));
    const OUT = K(new T.MeshBasicMaterial({ color: "#10121e", side: T.BackSide }));
    const ol = (m, s = 1.035) => { const o = new T.Mesh(m.geometry, OUT); o.scale.setScalar(s); m.add(o); return m; };

    /* ---------------- o céu: estrelas, faixa da galáxia e a chuva de meteoros ---------------- */
    scene.add(new T.Mesh(K(new T.SphereGeometry(800, 48, 24)), K(new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { uT },
      vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform float uT; varying vec3 vD; float h(vec3 p){ return fract(sin(dot(p, vec3(12.99, 78.23, 37.71))) * 43758.55); }
        void main(){ vec3 d = normalize(vD); float y = d.y; vec3 c = mix(vec3(0.12, 0.16, 0.34), vec3(0.02, 0.03, 0.1), smoothstep(0.0, 0.7, y)); c += vec3(0.25, 0.2, 0.4) * exp(-max(y, 0.0) * 8.0) * 0.5;
          float band = exp(-pow(dot(d, normalize(vec3(0.4, 0.5, -0.75))) * 3.0, 2.0)); c += vec3(0.35, 0.3, 0.55) * band * 0.35 * smoothstep(0.0, 0.3, y);
          for (int L = 0; L < 3; L++) { float sc = 200.0 + float(L) * 150.0; vec3 q = d * sc, i = floor(q); float s = h(i + float(L) * 7.0); vec3 o = vec3(h(i + 1.1), h(i + 2.2), h(i + 3.3)) * 0.6 + 0.2;
            c += vec3(0.9, 0.92, 1.0) * step(0.982 - band * 0.02, s) * smoothstep(0.1, 0.0, length(fract(q) - o)) * (0.6 + 0.4 * sin(uT * (1.0 + s * 3.0) + s * 50.0)) * step(0.02, y); }
          gl_FragColor = vec4(c, 1.0); }` }))));
    const meteors = []; for (let i = 0; i < (small ? 14 : 26); i++) { const m = new T.Mesh(K(new T.PlaneGeometry(1, 0.06)), K(new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, uniforms: { uA: { value: 0 } },
      vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: "uniform float uA; varying vec2 vU; void main(){ float a = pow(vU.x, 3.0) * smoothstep(0.5, 0.0, abs(vU.y - 0.5)) * uA; gl_FragColor = vec4(vec3(0.75, 0.9, 1.0) * a * 2.0, a); }" }))); scene.add(m); meteors.push({ m, t: -rnd() * 6, dur: 1.2 + rnd() * 1.4 }); }
    scene.add(new T.HemisphereLight("#7a8ad8", "#1a2a2a", 0.8)); const moon = new T.DirectionalLight("#a8c0ff", 0.7); moon.position.set(-5, 8, 6); scene.add(moon);

    /* ---------------- o chão, os morros e o campo de flores ---------------- */
    const H = (x, z) => Math.max(0, (Math.sin(x * 0.07) * 0.6 + Math.cos(z * 0.05) * 0.5)) + 3.2 * Math.exp(-((x + 1) ** 2 + (z + 9) ** 2) / 26);
    { const g = K(new T.PlaneGeometry(160, 160, 120, 120)); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i))); g.computeVertexNormals(); scene.add(new T.Mesh(g, toon("#2a4a3a"))); }
    for (let i = 0; i < 12; i++) { const a = -2.2 + i * 0.4, r = 70 + rnd() * 30; const m = add(new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon("#1a2a3a"), Math.cos(a) * r, -1, Math.sin(a) * r - 20); m.scale.set(26, 10 + rnd() * 12, 18); }
    const FN = small ? 6000 : 14000, fg = K(new T.PlaneGeometry(0.12, 0.12)); const fmat = K(new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: { uT },
      vertexShader: `uniform float uT; attribute float aS; varying float vS, vH; varying vec2 vU; void main(){ vU = uv; vS = aS; vec3 c = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; c.x += sin(uT * 0.8 + c.z * 0.4 + aS * 6.0) * 0.03; vH = c.y; vec4 mv = viewMatrix * vec4(c, 1.0); mv.xy += position.xy * (0.8 + aS * 0.6); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uT; varying float vS, vH; varying vec2 vU; void main(){ vec2 q = vU - 0.5; float a = atan(q.y, q.x), r = length(q); float pet = 0.32 + 0.1 * cos(a * 5.0); float f = smoothstep(pet, pet - 0.06, r); if (f < 0.05) discard;
        float tw = 0.75 + 0.25 * sin(uT * (1.0 + vS * 2.0) + vS * 30.0); vec3 c = mix(vec3(0.35, 0.6, 1.0), vec3(0.75, 0.9, 1.0), smoothstep(0.12, 0.0, r)) * tw * 1.2; gl_FragColor = vec4(c, f * 0.95); }` }));
    { const im = new T.InstancedMesh(fg, fmat, FN), m = new T.Matrix4(), aS = new Float32Array(FN); let k = 0; while (k < FN) { const x = (rnd() - 0.5) * 40, z = -14 + rnd() * 22; if (Math.hypot(x - OVERP.x, z - OVERP.z) < 1.5) continue; m.makeTranslation(x, H(x, z) + 0.15 + rnd() * 0.25, z); im.setMatrixAt(k, m); aS[k] = rnd(); k++; }
      fg.setAttribute("aS", new T.InstancedBufferAttribute(aS, 1)); im.frustumCulled = false; scene.add(im); }
    // folhinhas escuras por baixo das flores
    { const N = small ? 3000 : 7000, bl = K(new T.PlaneGeometry(0.04, 0.35, 1, 2)); bl.translate(0, 0.17, 0); const im = new T.InstancedMesh(bl, toon("#1e3a30", { side: T.DoubleSide }), N), m = new T.Matrix4(), q = new T.Quaternion(); for (let i = 0; i < N; i++) { const x = (rnd() - 0.5) * 40, z = -14 + rnd() * 22; q.setFromAxisAngle(V3(0, 1, 0), rnd() * 3); m.compose(V3(x, H(x, z), z), q, V3(1, 0.6 + rnd(), 1)); im.setMatrixAt(i, m); } scene.add(im); }
    // luzinhas subindo do campo
    const motes = []; for (let i = 0; i < 60; i++) { const s = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xa8d0ff, transparent: true, opacity: 0.5, depthWrite: false, blending: T.AdditiveBlending }))); s.scale.setScalar(0.12); scene.add(s); motes.push({ s, x: (rnd() - 0.5) * 16, z: -8 + rnd() * 12, ph: rnd() }); }

    /* ---------------- no alto do morro, a estátua de um cavaleiro antigo (original) ---------------- */
    const statue = new T.Group(); statue.visible = false; const SX = -1, SZ = -9; statue.position.set(SX, H(SX, SZ), SZ); statue.rotation.y = 0.25; scene.add(statue);
    { const stone = toon("#8a90a0"), dark = toon("#5a6070");
      add(new T.CylinderGeometry(0.9, 1.0, 1.0, 8), dark, 0, 0.5, 0, 0, 0, 0, statue); add(new T.CylinderGeometry(0.75, 0.8, 0.22, 8), stone, 0, 1.1, 0, 0, 0, 0, statue);
      ol(add(new T.CylinderGeometry(0.34, 0.42, 1.1, 10), stone, 0, 1.85, 0, 0, 0, 0, statue)); ol(add(new T.SphereGeometry(0.42, 14, 10), stone, 0, 2.45, 0, 0, 0, 0, statue)).scale.set(1, 0.8, 0.85);
      for (const s2 of [-1, 1]) ol(add(new T.SphereGeometry(0.22, 12, 10), stone, s2 * 0.46, 2.55, 0, 0, 0, 0, statue));
      // elmo fechado com crista, e um escudo redondo apoiado no chão
      ol(add(new T.CylinderGeometry(0.2, 0.22, 0.38, 12), stone, 0, 3.0, 0, 0, 0, 0, statue)); add(new T.BoxGeometry(0.06, 0.3, 0.42), dark, 0, 3.28, 0, 0, 0, 0, statue); add(new T.BoxGeometry(0.26, 0.03, 0.02), dark, 0, 3.02, 0.21, 0, 0, 0, statue);
      ol(add(new T.CylinderGeometry(0.5, 0.5, 0.08, 20), stone, 0.55, 1.75, 0.35, Math.PI / 2, -0.4, 0.1, statue)); add(new T.SphereGeometry(0.1, 10, 8), dark, 0.58, 1.75, 0.42, 0, 0, 0, statue);
      add(new T.BoxGeometry(0.07, 1.2, 0.02), toon("#b8c0d0"), -0.42, 1.9, 0.35, 0, 0, 0.08, statue); add(new T.BoxGeometry(0.3, 0.05, 0.05), stone, -0.47, 2.45, 0.35, 0, 0, 0.08, statue);
      // musgo e flores crescendo na base
      for (let i = 0; i < 10; i++) { const a = i * 0.63; add(new T.SphereGeometry(0.12 + rnd() * 0.08, 8, 6), toon("#3a6a4a"), Math.cos(a) * 0.95, 0.15 + rnd() * 0.3, Math.sin(a) * 0.95, 0, 0, 0, statue); } }
    // um baú velho esquecido no pé do morro... que às vezes abre a boca sozinho
    const chest = new T.Group(); chest.position.set(2.6, H(2.6, -2.2), -2.2); chest.rotation.y = -0.6; scene.add(chest);
    new T.GLTFLoader().load(ctx.base + "frieren/bau.glb", (gl) => { const m = gl.scene; const box = new T.Box3().setFromObject(m), sz = box.getSize(V3()), k = 0.7 / Math.max(sz.x, sz.z);
      m.scale.setScalar(k); m.position.set(-(box.min.x + box.max.x) / 2 * k, -box.min.y * k, -(box.min.z + box.max.z) / 2 * k); const ms = []; m.traverse((o) => { if (o.isMesh) ms.push(o); }); ms.forEach((o) => { const mp = o.material.map; o.material = toon("#ffffff", { map: mp }); ol(o, 1.02); }); chest.add(m); });
    const chestGlow = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xffd070, transparent: true, opacity: 0.35, depthWrite: false, blending: T.AdditiveBlending }))); chestGlow.scale.setScalar(1.1); chestGlow.position.y = 0.35; chest.add(chestGlow);
    const chestHit = add(new T.BoxGeometry(0.9, 0.7, 0.7), K(new T.MeshBasicMaterial()), 0, 0.35, 0, 0, 0, 0, chest); chestHit.visible = false; let chestT = 0;
    const statueLight = new T.PointLight("#a8c0ff", 0, 7, 2); statueLight.position.set(SX + 0.5, H(SX, SZ) + 3.5, SZ + 2); scene.add(statueLight);

    /* ---------------- uma maga élfica viajante, no meio das flores, olhando o céu (personagem original) ---------------- */
    const fr = new T.Group(); const FX = 0.9, FZ = 1.2; fr.position.set(FX, H(FX, FZ), FZ); fr.rotation.y = Math.PI + 0.45; scene.add(fr);
    { const mage = ctx.person({ h: 1.55, skin: "#f4dcc8", hair: "#2a3a5a", hairStyle: "coque", top: "#4a6a5a", bottom: "#3a2e2a", longSleeves: true, cloak: "#7a4a2a", ears: true, shoes: "#4a3424" });
      mage.g.visible = false; fr.add(mage.g); mage.head.rotation.x = -0.4;
      // o cajado de madeira torta com um cristal âmbar e uma fita
      const staff = new T.Group(); staff.position.set(0.26, 0, 0.06); fr.add(staff);
      add(new T.CylinderGeometry(0.016, 0.022, 1.7, 8), toon("#6a4a2a"), 0, 0.85, 0, 0, 0, 0.04, staff); const cr = add(new T.OctahedronGeometry(0.07, 0), K(new T.MeshBasicMaterial({ color: "#ffc860" })), 0.03, 1.78, 0, 0, 0, 0, staff); cr.scale.set(0.8, 1.4, 0.8);
      const cg = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xffc860, transparent: true, opacity: 0.7, depthWrite: false, blending: T.AdditiveBlending }))); cg.scale.setScalar(0.45); cg.position.set(0.03, 1.78, 0); staff.add(cg);
      add(new T.PlaneGeometry(0.05, 0.3), toon("#c83a4a", { side: T.DoubleSide }), 0.05, 1.55, 0, 0, 0, 0.2, staff);
      mage.arms[1].sh.rotation.x = -0.3; mage.arms[1].sh.rotation.z = -0.25; mage.arms[1].el.rotation.x = -0.5;
      fr.userData.head = mage.head; fr.userData.staff = staff; }

    /* ---------------- os agradecimentos: tufos de flores que brilham ---------------- */
    const tx = ctx.textos ? ctx.textos() : { agradecimentos: [] };
    const list = tx.agradecimentos && tx.agradecimentos.length ? tx.agradecimentos : [{ t: "Agradecimentos", s: "em breve", r: "Este texto ainda vai ser escrito." }];
    const sub = { name: "Agradecimentos", acts: list.map((a) => Object.assign({ k: [], l: [] }, a)) };
    const tufts = sub.acts.map((a, i) => { const n = sub.acts.length, k = n > 1 ? i / (n - 1) : 0.5, x = -2.4 + k * 4.0, z = 3.4 - Math.sin(k * Math.PI) * 0.9;
      const g = new T.Group(); g.position.set(x, H(x, z), z); scene.add(g);
      for (let j = 0; j < 7; j++) { const st = add(new T.CylinderGeometry(0.008, 0.01, 0.5, 5), toon("#2a5a4a"), (rnd() - 0.5) * 0.25, 0.25, (rnd() - 0.5) * 0.25, 0, (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.3, g); const f = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0x8ac0ff, transparent: true, opacity: 0.9, depthWrite: false, blending: T.AdditiveBlending }))); f.scale.setScalar(0.22); f.position.copy(st.position).add(V3(0, 0.27, 0)); g.add(f); }
      const halo = new T.Sprite(K(new T.SpriteMaterial({ map: ctx.glowTex, color: 0xb8d8ff, transparent: true, opacity: 0.4, depthWrite: false, blending: T.AdditiveBlending }))); halo.scale.setScalar(1.3); halo.position.y = 0.5; g.add(halo);
      const hit = add(new T.CylinderGeometry(0.4, 0.4, 1.0, 8), K(new T.MeshBasicMaterial()), 0, 0.5, 0, 0, 0, 0, g); hit.visible = false;
      return { g, halo, hit, a, i, hot: 0 }; });

    /* ---------------- o som: vento, um sino de vidro distante ---------------- */
    let audio = null;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)(), out = ac.createGain(); out.gain.value = 0; out.connect(ac.destination); const nodes = [];
      const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; const bq = ac.createBiquadFilter(); bq.type = "lowpass"; bq.frequency.value = 500; const g = ac.createGain(); g.gain.value = 0.05; s.connect(bq).connect(g).connect(out); s.start(); nodes.push(s);
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.08; lg.gain.value = 300; lfo.connect(lg).connect(bq.frequency); lfo.start(); nodes.push(lfo);
      const chime = () => { if (!audio) return; const t0 = ac.currentTime, base = [523.25, 659.25, 783.99, 987.77][Math.floor(Math.random() * 4)]; for (const m of [1, 2.01, 3.02]) { const o = ac.createOscillator(), gg = ac.createGain(); o.frequency.value = base * m; gg.gain.setValueAtTime(0.0001, t0); gg.gain.exponentialRampToValueAtTime(0.03 / m, t0 + 0.02); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + 3); o.connect(gg).connect(out); o.start(t0); o.stop(t0 + 3.1); } setTimeout(chime, 4000 + Math.random() * 6000); }; setTimeout(chime, 1500);
      out.gain.linearRampToValueAtTime(0.75, ac.currentTime + 2.5); audio = { ac, out, nodes };
    } catch (e) { audio = null; }

    /* ---------------- câmera ---------------- */
    const OVER = { pos: OVERP.clone(), tgt: OVERT.clone() };
    const cam = { pos: OVER.pos.clone(), tgt: OVER.tgt.clone(), yaw: 0, pitch: 0, yawT: 0, pitchT: 0 };
    let glide = null, focus = null, hot = null;
    const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
    function to(pose, dur = 2.0) { if (ctx.reduce) { cam.pos.copy(pose.pos); cam.tgt.copy(pose.tgt); return; } glide = { p0: cam.pos.clone(), t0: cam.tgt.clone(), p1: pose.pos.clone(), t1: pose.tgt.clone(), u: 0, dur }; cam.yawT = cam.pitchT = 0; }
    function openTuft(tf) { focus = tf; const p = tf.g.position; to({ pos: p.clone().add(V3(0.3, 1.2, 2.0)), tgt: p.clone().add(V3(0, 0.5, 0)) }); setTimeout(() => { if (focus === tf && ctx.openPages) ctx.openPages(sub, tf.i); }, ctx.reduce ? 0 : 1500); }
    setTimeout(() => { try { ctx.toast("Frieren", "O campo de flores", "Cada tufo de flores que brilha mais forte guarda um agradecimento."); } catch (e) { /* sem aviso */ } }, 900);

    const ray = new T.Raycaster();
    const fx = ctx.fantasy(scene, { center: V3(0, 1.6, -1), radius: 8, height: 2.2, colors: ["#9ec8ff", "#ffd890", "#c8a8ff"], count: 0, power: 1.2, dim: 0.7, motes: 0, moteSize: 0.025 });
    return {
      name: "O campo de flores", sub: "Agradecimentos",
      update(dt, t) {
        fx.update(t);
        uT.value = t;
        if (glide) { glide.u = Math.min(1, glide.u + dt / glide.dur); const e = smoother(glide.u); cam.pos.lerpVectors(glide.p0, glide.p1, e); cam.tgt.lerpVectors(glide.t0, glide.t1, e); if (glide.u >= 1) glide = null; }
        const k = 1 - Math.exp(-dt * 3.5); cam.yaw += (cam.yawT - cam.yaw) * k; cam.pitch += (cam.pitchT - cam.pitch) * k;
        const d = cam.tgt.clone().sub(cam.pos), r = d.length(), yw = Math.atan2(d.z, d.x) + cam.yaw, pt = Math.asin(Math.max(-0.99, Math.min(0.99, d.y / r))) + cam.pitch;
        camera.position.copy(cam.pos).add(V3(0, Math.sin(t * 0.45) * 0.01, 0)); camera.lookAt(cam.pos.x + Math.cos(yw) * Math.cos(pt), cam.pos.y + Math.sin(pt), cam.pos.z + Math.sin(yw) * Math.cos(pt));
        for (const m of meteors) { m.t += dt; if (m.t > m.dur) { m.t = -rnd() * 4; m.a = -0.6 - rnd() * 0.5; m.p = V3(-40 + rnd() * 120, 60 + rnd() * 50, -120 - rnd() * 60); m.len = 10 + rnd() * 18; }
          if (m.t < 0 || !m.p) { m.m.material.uniforms.uA.value = 0; continue; } const u = m.t / m.dur, dir = V3(Math.cos(m.a), Math.sin(m.a), 0); m.m.position.copy(m.p).addScaledVector(dir, u * 40); m.m.scale.set(m.len, 2, 1); m.m.rotation.set(0, 0, m.a + Math.PI); m.m.lookAt(camera.position); m.m.rotateZ(m.a + Math.PI); m.m.material.uniforms.uA.value = Math.sin(u * Math.PI); }
        for (const mo of motes) { const q = (t * 0.05 + mo.ph) % 1; mo.s.position.set(mo.x + Math.sin(t * 0.3 + mo.ph * 9) * 0.4, H(mo.x, mo.z) + 0.2 + q * 3, mo.z); mo.s.material.opacity = 0.6 * Math.sin(q * Math.PI); }
        if (fr.userData.head) { fr.userData.head.rotation.y = Math.sin(t * 0.2) * 0.15; fr.userData.staff.rotation.z = Math.sin(t * 0.6) * 0.02; }
        chestT = Math.max(0, chestT - dt); chest.scale.set(1, 1 + Math.sin(chestT * 18) * 0.12 * chestT, 1); chest.position.y = H(2.6, -2.2) + Math.abs(Math.sin(chestT * 9)) * 0.12 * chestT; chestGlow.material.opacity = 0.3 + 0.1 * Math.sin(t * 2) + chestT * 0.4;
        for (const tf of tufts) { tf.hot += ((hot === tf || focus === tf ? 1 : 0) - tf.hot) * Math.min(1, dt * 6); tf.halo.material.opacity = 0.35 + 0.15 * Math.sin(t * 1.6 + tf.i) + tf.hot * 0.45; tf.halo.scale.setScalar(1.3 + tf.hot * 0.5); }
      },
      render(renderer) { renderer.setRenderTarget(null); renderer.render(scene, camera); },
      resize(w, h) { camera.aspect = w / h; const tall = w / h < 0.8; camera.fov = tall ? 72 : 52; camera.updateProjectionMatrix(); OVER.pos.copy(tall ? V3(0.4, 1.8, 9.5) : OVERP); if (!focus && !glide) cam.pos.copy(OVER.pos); },
      pick(ndc) { ray.setFromCamera(ndc, camera); if (ray.intersectObject(chestHit, false).length) { hot = null; return { label: ["Um baú esquecido", "abrir?"], go: () => { chestT = 1.2; try { ctx.toast("Cuidado", "Era um baú mímico", "Ele só queria um abraço."); } catch (e) { /* nada */ } } }; } const hits = ray.intersectObjects(tufts.map((x) => x.hit), false); const tf = hits[0] && tufts.find((x) => x.hit === hits[0].object); hot = tf || null; return tf ? { label: [tf.a.t, "um agradecimento"], go: () => openTuft(tf) } : null; },
      look(dx, dy) { if (glide) return; cam.yawT = Math.max(-1.0, Math.min(1.0, cam.yawT - dx * 0.003)); cam.pitchT = Math.max(-0.3, Math.min(0.6, cam.pitchT - dy * 0.003)); },
      back() { if (focus) { focus = null; to(OVER); return true; } return false; },
      dispose() { if (audio) { const a = audio; audio = null; try { a.out.gain.linearRampToValueAtTime(0, a.ac.currentTime + 0.5); setTimeout(() => { a.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* já parou */ } }); a.ac.close(); }, 700); } catch (e) { /* sem som */ } } keep.forEach((o) => o.dispose && o.dispose()); },
    };
  };
})();
