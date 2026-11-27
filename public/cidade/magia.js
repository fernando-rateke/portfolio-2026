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

    /* 4. pétalas de cerejeira caindo no pátio do santuário e na beira do lago */
    {
      const N = 260, geo = new T.PlaneGeometry(0.05, 0.035); const m = new T.MeshStandardMaterial({ color: "#f8c8d4", emissive: new T.Color("#ff9ab8"), emissiveIntensity: 0.12, side: T.DoubleSide, roughness: 0.8 });
      // cada pétala anda sozinha na placa de vídeo (anim.js): cai 9 m girando e volta ao alto, em ciclo
      const P = []; const zonas = [[0, null, (L.Z_ESC0 + L.Z_ESC1) / 2, 6, 21], [0, null, (L.Z_ESC0 + L.Z_ESC1) / 2, 6, 21]]; // só a escadaria das cerejeiras (o resto saiu)
      for (let i = 0; i < N; i++) { const zz = zonas[i % zonas.length]; const z = zz[2] + (rnd() - 0.5) * zz[4] * 2; P.push({ c: zz, gy: zz[1] == null ? M.yEsc(z) : zz[1], x: zz[0] + (rnd() - 0.5) * zz[3] * 2, z, y0: rnd(), ph: rnd() * 6.28, sp: 0.25 + rnd() * 0.35 }); }
      const aP = new Float32Array(N * 4), aQ = new Float32Array(N * 2);
      P.forEach((a, i) => { aP.set([a.x, a.z, a.gy, a.ph], i * 4); aQ.set([a.y0, a.sp], i * 2); });
      const im = M.anim.particulas({ geo, mat: m, n: N, chave: "petala", attrs: { aP: [aP, 4], aQ: [aQ, 2] },
        mover: `float H = 9., k = mod(aQ.x * H + uT * aQ.y, H);
          desl = vec3(aP.x + sin(uT * 0.6 + aP.w) * 0.8 + k * 0.25, aP.z + H - k, aP.y + cos(uT * 0.5 + aP.w) * 0.6);
          giro = rotX(uT * 1.7 + aP.w) * rotY(uT * 1.1 + aP.w) * rotZ(uT * 0.7);` });
      im.layers.set(1); scene.add(im);
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

  });
})();
