/* A magia, discreta: lanternas de pedra que se acendem sozinhas, pequenas luzes subindo pela escadaria de torii,
   pétalas de cerejeira caindo no santuário, vaga-lumes no arrozal e na floresta, lanternas de papel subindo do
   lago e as primeiras estrelas. Nada pisca forte, nada ocupa a tela. */
(() => {
  const M = (window.MUNDO = window.MUNDO || {});
  M.builders = M.builders || [];
  M.builders.push(async (M) => {
    const { T, scene, h, L, rnd, V3, ticks } = M;
    const glowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new T.CanvasTexture(c); return t; })();

    /* pontos de luz com brilho próprio: tamanho em perspectiva, piscar suave e deriva */
    function luzinhas(n, gen, opt) {
      const pos = new Float32Array(n * 3), ph = new Float32Array(n), base = [];
      for (let i = 0; i < n; i++) { const p = gen(i); base.push(p); pos.set([p.x, p.y, p.z], i * 3); ph[i] = rnd() * 100; }
      const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("ph", new T.BufferAttribute(ph, 1));
      const m = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending,
        uniforms: { uT: { value: 0 }, uMap: { value: glowTex }, uCol: { value: new T.Color(opt.cor) }, uSize: { value: opt.tam }, uDrift: { value: opt.deriva || 0.4 }, uBlink: { value: opt.pisca == null ? 1 : opt.pisca }, uPx: { value: renderer().getPixelRatio() } },
        vertexShader: `attribute float ph; uniform float uT, uSize, uDrift, uBlink, uPx; varying float vA;
          void main(){ vec3 p = position; float t = uT * 0.35 + ph;
            p += vec3(sin(t * 1.3 + ph) , sin(t * 0.9 + ph * 1.7) * 0.5, cos(t * 1.1 + ph * 0.7)) * uDrift;
            float b = 0.5 + 0.5 * sin(uT * (1.1 + fract(ph) * 1.4) + ph * 6.0); vA = mix(1.0, smoothstep(0.15, 1.0, b), uBlink);
            vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uSize * uPx * 300. / -mv.z; }`,
        fragmentShader: `uniform sampler2D uMap; uniform vec3 uCol; varying float vA; void main(){ float a = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(uCol * a * vA, a * vA); }` });
      const pts = new T.Points(g, m); pts.frustumCulled = false; pts.layers.set(1); scene.add(pts); ticks.push((t) => { m.uniforms.uT.value = t; }); return pts;
    }
    const renderer = () => M.renderer;

    /* 1. lanternas de pedra: acesas, com chama que respira; as mais próximas iluminam o chão de verdade */
    if (M.toroLuz) { M.toroLuz.emissiveIntensity = 1.4; ticks.push((t) => { M.toroLuz.emissiveIntensity = (1.3 + Math.sin(t * 2.3) * 0.08 + Math.sin(t * 7.1) * 0.05) * (M.toroLuz.userData.k || 1); }); }
    for (const t of M.toros || []) { const w = new T.Vector3(); t.getWorldPosition(w); w.y += 1.5 * t.scale.y; M.luzFonte && M.luzFonte(w, "#ffa860", 0.9, 6); }
    if (M.haidenLuz) { const w = M.haiden.position.clone().add(V3(0, 2.5, 4.6)); M.luzFonte && M.luzFonte(w, "#ffbe78", 1.6, 12); }
    if (M.casa) { const w = M.casa.position.clone().add(V3(4.6, 2, 0)); M.luzFonte && M.luzFonte(w, "#ffb468", 1.4, 10); }

    /* 2. pequenas luzes que sobem devagar pelo túnel de torii, como se subissem a escada junto */
    luzinhas(70, () => { const z = L.Z_ESC0 - rnd() * (L.Z_ESC0 - L.Z_ESC1); return V3((rnd() - 0.5) * 2.4, M.yEsc(z) + 0.3 + rnd() * 2.5, z); }, { cor: "#ffd9a0", tam: 0.05, deriva: 0.35, pisca: 0.6 });

    /* 3. vaga-lumes: no arrozal, na beira do lago e na trilha da floresta */
    luzinhas(260, () => { const x = (rnd() - 0.5) * 110, z = L.Z_VALE - 2 - rnd() * 62; return V3(x, h(x, z) + 0.4 + rnd() * 1.6, z); }, { cor: "#c8ff8a", tam: 0.045, deriva: 0.8 });
    luzinhas(120, () => { const z = L.Z_PLAT1 - 4 - rnd() * 52, x = M.trilhaX(z) + (rnd() - 0.5) * 16; return V3(x, h(x, z) + 0.5 + rnd() * 2.5, z); }, { cor: "#d8ffa0", tam: 0.04, deriva: 0.7 });
    luzinhas(90, () => { const a = rnd() * 6.28; const x = L.LAGO.x + Math.cos(a) * L.LAGO.rx * (0.95 + rnd() * 0.3), z = L.LAGO.z + Math.sin(a) * L.LAGO.rz * (0.95 + rnd() * 0.3); return V3(x, L.Y_AGUA + 0.4 + rnd() * 1.5, z); }, { cor: "#c8ff8a", tam: 0.05, deriva: 0.9 });

    /* 4. pétalas de cerejeira caindo no pátio do santuário e na beira do lago */
    {
      const N = 520, geo = new T.PlaneGeometry(0.05, 0.035); const m = new T.MeshStandardMaterial({ color: "#f8c8d4", emissive: new T.Color("#ff9ab8"), emissiveIntensity: 0.12, side: T.DoubleSide, roughness: 0.8 });
      const im = new T.InstancedMesh(geo, m, N); im.frustumCulled = false; im.layers.set(1); scene.add(im);
      // pátio do santuário, a cerejeira grande do pátio, a beira do lago e, a maior parte, a escadaria das cerejeiras
      const P = []; const zonas = [[0, L.Y_TOPO, -132, 22, 18], [13, L.Y_TOPO, -126, 7, 9], [0, L.Y_AGUA, -268, 40, 8], [0, null, (L.Z_ESC0 + L.Z_ESC1) / 2, 6, 21], [0, null, (L.Z_ESC0 + L.Z_ESC1) / 2, 6, 21]];
      for (let i = 0; i < N; i++) { const zz = zonas[i % zonas.length]; const z = zz[2] + (rnd() - 0.5) * zz[4] * 2; P.push({ c: zz, gy: zz[1] == null ? M.yEsc(z) : zz[1], x: zz[0] + (rnd() - 0.5) * zz[3] * 2, z, y0: rnd(), ph: rnd() * 6.28, sp: 0.25 + rnd() * 0.35 }); }
      const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3(1, 1, 1), p = new T.Vector3();
      ticks.push((t) => { for (let i = 0; i < N; i++) { const a = P[i], H = 9; const k = ((a.y0 * H + t * a.sp) % H);
        const gy = a.gy; p.set(a.x + Math.sin(t * 0.6 + a.ph) * 0.8 + k * 0.25, gy + H - k, a.z + Math.cos(t * 0.5 + a.ph) * 0.6);
        e.set(t * 1.7 + a.ph, t * 1.1 + a.ph, t * 0.7); q.setFromEuler(e); m4.compose(p, q, sc); im.setMatrixAt(i, m4); } im.instanceMatrix.needsUpdate = true; });
    }

    /* 5. lanternas de papel subindo do lago, bem devagar, e seus reflexos na água */
    {
      const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new T.Vector2(0.16 + Math.sin(t * Math.PI) * 0.06 - t * 0.04, t * 0.42)); }
      const geo = new T.LatheGeometry(pts, 12);
      const m = new T.MeshStandardMaterial({ color: "#ffc890", emissive: new T.Color("#ff8a30"), emissiveIntensity: 1.25, roughness: 0.9, transparent: true, opacity: 0.95, side: T.DoubleSide });
      const N = 46, im = new T.InstancedMesh(geo, m, N); im.frustumCulled = false; scene.add(im);
      const A = []; for (let i = 0; i < N; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()); A.push({ x: L.LAGO.x + Math.cos(a) * r * L.LAGO.rx * 0.8, z: L.LAGO.z + Math.sin(a) * r * L.LAGO.rz * 0.8 - 6, h0: rnd(), sp: 0.18 + rnd() * 0.12, ph: rnd() * 6.28 }); }
      const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: "#ffb070", transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.5 }));
      const halos = A.map(() => { const s = halo.clone(); s.scale.setScalar(1.6); scene.add(s); return s; });
      const m4 = new T.Matrix4(), p = new T.Vector3(), q = new T.Quaternion(), s1 = new T.Vector3(1, 1, 1);
      ticks.push((t) => { for (let i = 0; i < N; i++) { const a = A[i], H = 60, k = (a.h0 * H + t * a.sp) % H; const y = L.Y_AGUA + 0.3 + k;
        p.set(a.x + Math.sin(t * 0.2 + a.ph) * 1.5 * (k / H), y, a.z + Math.cos(t * 0.17 + a.ph) * 1.2 * (k / H)); q.setFromAxisAngle(V3(0, 0, 1), Math.sin(t * 0.8 + a.ph) * 0.06);
        m4.compose(p, q, s1); im.setMatrixAt(i, m4); halos[i].position.copy(p).add(V3(0, 0.2, 0)); halos[i].material.opacity = 0.45 * Math.min(1, k / 3);
        }
        im.instanceMatrix.needsUpdate = true; });
    }

    /* 6. o torii do lago: um anel de luz muito suave na água, respirando */
    if (M.toriiLago) {
      const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); const gr = g.createRadialGradient(128, 128, 30, 128, 128, 128); gr.addColorStop(0, "rgba(255,200,140,0)"); gr.addColorStop(0.55, "rgba(255,190,130,0.55)"); gr.addColorStop(0.7, "rgba(255,170,110,0.18)"); gr.addColorStop(1, "rgba(255,160,100,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      const ring = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.5 }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(M.toriiLago.position.x, L.Y_AGUA + 0.03, M.toriiLago.position.z); scene.add(ring);
      ticks.push((t) => { const k = (t * 0.08) % 1; ring.scale.setScalar(8 + k * 22); ring.material.opacity = 0.45 * (1 - k); });
    }

    /* 7. as primeiras estrelas, só no alto do céu, aparecendo e sumindo devagar */
    M.estrelas = luzinhas(700, () => { const a = rnd() * 6.28, el = 0.35 + rnd() * 1.1; const r = 480; return V3(Math.cos(a) * Math.cos(el) * r, Math.sin(el) * r, Math.sin(a) * Math.cos(el) * r - 200); }, { cor: "#fff4e8", tam: 0.55, deriva: 0, pisca: 0.7 });

    /* 8. raios de sol entre as árvores da floresta */
    {
      const c = document.createElement("canvas"); c.width = 64; c.height = 256; const g = c.getContext("2d"); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,200,140,0)"); gr.addColorStop(0.3, "rgba(255,200,140,0.6)"); gr.addColorStop(1, "rgba(255,200,140,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
      const g2 = g.getImageData(0, 0, 64, 256); for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) { const k = Math.sin((x / 63) * Math.PI); g2.data[(y * 64 + x) * 4 + 3] *= k; } g.putImageData(g2, 0, 0);
      const mt = new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.09, side: T.DoubleSide });
      const dir = M.sun.position.clone().normalize();
      for (let i = 0; i < 16; i++) { const z = L.Z_PLAT1 - 6 - rnd() * 48, x = M.trilhaX(z) + (rnd() - 0.5) * 18; const ray = new T.Mesh(new T.PlaneGeometry(1.2 + rnd() * 1.6, 22), mt); ray.position.set(x, h(x, z) + 8, z); ray.lookAt(ray.position.clone().add(V3(dir.z, 0, -dir.x))); ray.rotateX(-0.45); scene.add(ray); }
    }
  });
})();
