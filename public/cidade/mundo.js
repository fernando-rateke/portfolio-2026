/* O mundo depois da rua: a praça com o grande torii, a escadaria de pedra subindo o morro por dentro de um túnel
   de torii, o santuário no alto, a floresta descendo para o vale, os arrozais e o lago com o torii dentro d'água.
   O relevo inteiro sai de uma função de altura, h(x, z), que todo o resto consulta. */
(() => {
  const M = (window.MUNDO = window.MUNDO || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;
  // ruído suave (value noise) para o relevo não ficar de régua
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return mix(mix(hash(xi, yi), hash(xi + 1, yi), u), mix(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v); };
  const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.28 + vnoise(x * 4.3, y * 4.3) * 0.17;

  // o mapa, em metros: a rua vai de z=24 a z=-60; a escada sobe de z=-70 a z=-112; o santuário fica em -112..-150;
  // a floresta desce até -205; os arrozais vão até -262; o lago tem centro em z=-305.
  const L = M.L = { Z_ESC0: -70, Z_ESC1: -112, Y_TOPO: 18, Z_PLAT1: -150, Z_VALE: -205, Y_VALE: 3, LAGO: { x: 0, z: -305, rx: 74, rz: 42 }, Y_AGUA: 2.0 };
  function trilhaX(z) { return z > L.Z_PLAT1 ? 0 : -9 * smooth(L.Z_PLAT1, L.Z_PLAT1 - 25, z) + 9 * smooth(L.Z_VALE + 5, L.Z_VALE - 20, z) - 3 * Math.sin(z * 0.08) * smooth(L.Z_PLAT1, L.Z_PLAT1 - 15, z) * (1 - smooth(L.Z_VALE, L.Z_VALE - 15, z)); }
  M.trilhaX = trilhaX;
  function h(x, z) {
    let y = L.Y_TOPO * clamp((L.Z_ESC0 - z) / (L.Z_ESC0 - L.Z_ESC1), 0, 1);
    y -= (L.Y_TOPO - L.Y_VALE) * smooth(L.Z_PLAT1, L.Z_VALE, z);
    const ax = Math.abs(x);
    // o morro vai abrindo dos lados (não é uma rampa de parede a parede), longe da escada ganha ondulação
    const longeEsc = smooth(5, 22, ax);
    const morro = smooth(-58, -75, z) * (1 - smooth(L.Z_PLAT1 - 10, L.Z_VALE, z));
    y += morro * longeEsc * (fbm(x * 0.04, z * 0.04) * 9 - 2 + 6 * smooth(20, 90, ax));
    // paredes do vale e morros atrás do lago
    const vale = smooth(L.Z_PLAT1 - 20, L.Z_VALE, z);
    y += vale * (smooth(55, 150, ax) * 34 * (0.6 + fbm(x * 0.02, z * 0.02) * 0.8));
    y += smooth(-345, -420, z) * (30 + fbm(x * 0.015, z * 0.015) * 40);
    // fundo do vale: plano para os arrozais, com pouco relevo
    y += vale * (1 - smooth(40, 70, ax)) * (fbm(x * 0.08, z * 0.08) - 0.5) * 0.4;
    // o lago afunda o terreno
    const e = Math.pow((x - L.LAGO.x) / L.LAGO.rx, 2) + Math.pow((z - L.LAGO.z) / L.LAGO.rz, 2);
    if (e < 1.8) y = mix(L.Y_AGUA - 2.2, y, smooth(0.75, 1.5, e));
    // a trilha da floresta é aplainada
    if (z < L.Z_PLAT1 + 2 && z > L.Z_VALE - 20) { const d = Math.abs(x - trilhaX(z)); const base = L.Y_TOPO - (L.Y_TOPO - L.Y_VALE) * smooth(L.Z_PLAT1, L.Z_VALE, z); y = mix(base, y, smooth(1.8, 6, d)); }
    // o pátio do santuário é plano (com uma borda suave até a floresta)
    if (z < L.Z_ESC1 + 0.5) { const dx = Math.max(0, Math.abs(x) - 21), dz = Math.max(0, L.Z_PLAT1 + 1 - z); y = mix(L.Y_TOPO - 0.05, y, smooth(0, 6, Math.hypot(dx, dz))); }
    // cidade e praça ficam no zero
    if (z > -62) y *= 0; else if (z > -68 && ax < 30) y = Math.min(y, mix(0, y, smooth(-62, -68, z)));
    return y;
  }
  M.h = h;

  /* junta as malhas de um grupo numa só por material (bem menos chamadas de desenho) */
  function merge(group) {
    group.updateMatrixWorld(true); const by = new Map();
    group.traverse((o) => { if (!o.isMesh) return; const mats = Array.isArray(o.material) ? o.material : [o.material]; let g = o.geometry.clone().applyMatrix4(o.matrixWorld); if (g.index) g = g.toNonIndexed();
      if (Array.isArray(o.material) && o.geometry.groups.length) { for (const gr of o.geometry.groups) { const sub = new M.T.BufferGeometry(); for (const k of ["position", "normal", "uv"]) { const a = g.attributes[k]; if (!a) continue; sub.setAttribute(k, new M.T.BufferAttribute(a.array.slice(gr.start * a.itemSize, (gr.start + gr.count) * a.itemSize), a.itemSize)); } const m = mats[gr.materialIndex]; if (!by.has(m)) by.set(m, []); by.get(m).push(sub); } }
      else { const m = mats[0]; if (!by.has(m)) by.set(m, []); by.get(m).push(g); } });
    const out = new M.T.Group();
    for (const [m, gs] of by) { let n = 0; for (const g of gs) n += g.attributes.position.count; const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
      for (const g of gs) { pos.set(g.attributes.position.array, o * 3); if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; }
      const geo = new M.T.BufferGeometry(); geo.setAttribute("position", new M.T.BufferAttribute(pos, 3)); geo.setAttribute("normal", new M.T.BufferAttribute(nor, 3)); geo.setAttribute("uv", new M.T.BufferAttribute(uv, 2)); geo.computeBoundingSphere();
      const mesh = new M.T.Mesh(geo, m); mesh.castShadow = mesh.receiveShadow = true; out.add(mesh); }
    return out;
  }
  // várias cópias de um grupo já juntado, como InstancedMesh (uma chamada por material)
  function instances(merged, mats4) {
    const out = new M.T.Group();
    for (const c of merged.children) { const im = new M.T.InstancedMesh(c.geometry, c.material, mats4.length); mats4.forEach((m, i) => im.setMatrixAt(i, m)); im.castShadow = im.receiveShadow = true; im.frustumCulled = false; out.add(im); }
    return out;
  }
  const TRS = (x, y, z, ry = 0, s = 1) => new M.T.Matrix4().compose(new M.T.Vector3(x, y, z), new M.T.Quaternion().setFromAxisAngle(new M.T.Vector3(0, 1, 0), ry), new M.T.Vector3(s, s, s));
  M.TRS = TRS;

  M.builders = M.builders || [];
  M.builders.push(async (M) => {
    const { T, scene, pbr, tx, rnd } = M;
    const J = (M.J = M.japao(M));

    /* ---------- terreno: perto (detalhado) e longe (montanhas) ---------- */
    function terreno(x0, x1, z0, z1, step, far) {
      const nx = Math.round((x1 - x0) / step), nz = Math.round((z0 - z1) / step);
      const geo = new T.PlaneGeometry(x1 - x0, z0 - z1, nx, nz); geo.rotateX(-Math.PI / 2); geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
      const p = geo.attributes.position, uv = geo.attributes.uv, n = p.count, splat = new Float32Array(n * 3), col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const x = p.getX(i), z = p.getZ(i); let y = h(x, z);
        if (far && Math.abs(x) < 165 && z < 40 && z > -440) y -= 6; // por baixo do terreno de perto
        if (z > -61) y -= 0.1; // na cidade o chão fica sob o asfalto e as calçadas
        p.setY(i, y); uv.setXY(i, x / 5, z / 5);
        const sl = Math.hypot(h(x + 1, z) - h(x - 1, z), h(x, z + 1) - h(x, z - 1)) / 2; // inclinação
        const floresta = z < -62 && z > L.Z_VALE + 8 ? 1 : smooth(40, 80, Math.abs(x)) * (z < L.Z_VALE ? 1 : 0);
        const rocha = smooth(0.55, 1.0, sl);
        const lagoE = Math.pow((x - L.LAGO.x) / L.LAGO.rx, 2) + Math.pow((z - L.LAGO.z) / L.LAGO.rz, 2);
        const terra = Math.max(1 - smooth(0.9, 1.25, lagoE), (z < L.Z_PLAT1 && z > L.Z_VALE - 25 ? 1 - smooth(1.2, 3.2, Math.abs(x - trilhaX(z))) : 0));
        splat[i * 3] = floresta * (1 - rocha); splat[i * 3 + 1] = rocha; splat[i * 3 + 2] = terra;
        const v = 0.82 + fbm(x * 0.05, z * 0.05) * 0.36; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
      }
      geo.setAttribute("splat", new T.BufferAttribute(splat, 3)); geo.setAttribute("color", new T.BufferAttribute(col, 3)); geo.computeVertexNormals();
      const m = new T.MeshStandardMaterial({ map: tx("leafy_grass", "diff", [1, 1], true), normalMap: tx("leafy_grass", "nor", [1, 1]), roughness: 1, vertexColors: true, color: "#c8c8b8" });
      const U = { tB: { value: tx("leaves_forest_ground", "diff", [1, 1], true) }, tC: { value: tx("rock_wall_10", "diff", [1, 1], true) }, tD: { value: tx("farm_soil", "diff", [1, 1], true) } };
      m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec3 splat; varying vec3 vSplat;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvSplat = splat;");
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D tB, tC, tD; varying vec3 vSplat;")
          .replace("#include <map_fragment>", `vec4 cA = texture2D(map, vUv), cA2 = texture2D(map, vUv * 0.23 + 0.31);
            cA = mix(cA, cA2, 0.35);
            vec4 cB = texture2D(tB, vUv * 2.6), cC = texture2D(tC, vUv * 0.5), cD = texture2D(tD, vUv * 1.6);
            vec4 sc = cA; sc = mix(sc, cB, vSplat.x); sc = mix(sc, cD, vSplat.z); sc = mix(sc, cC, vSplat.y);
            diffuseColor *= sc;`); };
      const mesh = new T.Mesh(geo, m); mesh.receiveShadow = true; scene.add(mesh); return mesh;
    }
    terreno(-165, 165, 40, -440, 2, false);
    const far = terreno(-1300, 1300, 1100, -1500, 26, true); far.receiveShadow = false;

    /* ---------- água ---------- */
    /* o lago é um espelho de verdade: a cena é desenhada de novo, vista de baixo da água, numa textura; a água
       mistura esse reflexo com a cor funda, ondulando de leve (como o Reflector do three.js, escrito aqui) */
    function espelho(geo) {
      const pr = M.renderer.getPixelRatio(), k = M.leve ? 0.33 : 0.5;
      const rt = new T.WebGLRenderTarget(Math.max(256, innerWidth * pr * k), Math.max(256, innerHeight * pr * k));
      addEventListener("resize", () => rt.setSize(Math.max(256, innerWidth * pr * k), Math.max(256, innerHeight * pr * k)));
      const tm = new T.Matrix4(), vc = new T.PerspectiveCamera();
      const mat = new T.ShaderMaterial({ fog: true, transparent: false,
        uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { tRefl: { value: null }, tMat: { value: tm }, uT: { value: 0 }, uFundo: { value: new T.Color("#0e1418") } }]),
        vertexShader: `uniform mat4 tMat; varying vec4 vR; varying vec3 vW;
          #include <fog_pars_vertex>
          void main(){ vR = tMat * vec4(position, 1.); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
          }`,
        fragmentShader: `uniform sampler2D tRefl; uniform float uT; uniform vec3 uFundo; varying vec4 vR; varying vec3 vW;
          #include <fog_pars_fragment>
          void main(){ vec2 p = vW.xz;
            vec2 d = vec2(sin(p.x * 0.9 + uT * 0.8) + sin(p.y * 1.3 - uT * 0.6) * 0.6 + sin((p.x + p.y) * 2.7 + uT * 1.7) * 0.3,
                          cos(p.y * 0.8 + uT * 0.7) + cos(p.x * 1.6 - uT * 0.9) * 0.5 + cos((p.x - p.y) * 3.1 + uT * 1.4) * 0.3) * 0.006;
            vec3 r = texture2DProj(tRefl, vR + vec4(d * vR.w, 0., 0.)).rgb;
            vec3 v = normalize(cameraPosition - vW); float fr = 0.25 + 0.75 * pow(1. - max(v.y, 0.), 3.);
            vec3 col = mix(uFundo, r, fr);
            // o reflexo já sai com o tom final; aqui só converte a cor para a tela
            gl_FragColor = vec4(col, 1.);
            #include <encodings_fragment>
            #include <fog_fragment>
          }` });
      mat.uniforms.tRefl.value = rt.texture; mat.uniforms.tMat.value = tm;
      const mesh = new T.Mesh(geo, mat);
      const wp = new T.Vector3(), cp = new T.Vector3(), nrm = new T.Vector3(), rot = new T.Matrix4(), look = new T.Vector3(), tgt = new T.Vector3(), view = new T.Vector3(), plane = new T.Plane(), clip = new T.Vector4(), q = new T.Vector4();
      let ocupado = false;
      mesh.onBeforeRender = (renderer, sc, camera) => {
        if (ocupado) return; mat.uniforms.uT.value = performance.now() / 1000;
        // longe do lago a névoa esconde tudo: não vale a pena desenhar a cena de novo
        if (camera.position.distanceTo(mesh.position) > 170) return;
        wp.setFromMatrixPosition(mesh.matrixWorld); cp.setFromMatrixPosition(camera.matrixWorld); rot.extractRotation(mesh.matrixWorld); nrm.set(0, 0, 1).applyMatrix4(rot);
        view.subVectors(wp, cp); if (view.dot(nrm) > 0) return; view.reflect(nrm).negate().add(wp);
        rot.extractRotation(camera.matrixWorld); look.set(0, 0, -1).applyMatrix4(rot).add(cp);
        tgt.subVectors(wp, look).reflect(nrm).negate().add(wp);
        vc.position.copy(view); vc.up.set(0, 1, 0).applyMatrix4(rot).reflect(nrm); vc.lookAt(tgt); vc.far = camera.far; vc.updateMatrixWorld(); vc.projectionMatrix.copy(camera.projectionMatrix);
        tm.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse).multiply(mesh.matrixWorld);
        plane.setFromNormalAndCoplanarPoint(nrm, wp).applyMatrix4(vc.matrixWorldInverse); clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
        const e = vc.projectionMatrix.elements; q.set((Math.sign(clip.x) + e[8]) / e[0], (Math.sign(clip.y) + e[9]) / e[5], -1, (1 + e[10]) / e[14]);
        clip.multiplyScalar(2 / clip.dot(q)); e[2] = clip.x; e[6] = clip.y; e[10] = clip.z + 1 - 0.003; e[14] = clip.w;
        ocupado = true; mesh.visible = false; const prev = renderer.getRenderTarget(), sau = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
        renderer.setRenderTarget(rt); renderer.state.buffers.depth.setMask(true); if (renderer.autoClear === false) renderer.clear(); const nv = sc.fog; sc.fog = null; renderer.render(sc, vc); sc.fog = nv;
        renderer.shadowMap.autoUpdate = sau; renderer.setRenderTarget(prev); mesh.visible = true; ocupado = false;
      };
      return mesh;
    }
    const lago = espelho(new T.CircleGeometry(1, 64)); lago.rotation.x = -Math.PI / 2; lago.scale.set(L.LAGO.rx * 1.45, L.LAGO.rz * 1.45, 1); lago.position.set(L.LAGO.x, L.Y_AGUA, L.LAGO.z); scene.add(lago); M.lago = lago;

    /* ---------- praça e o grande torii ---------- */
    const praca = new T.Mesh(new T.PlaneGeometry(14, 10), pbr("stone_pathway", [3.5, 2.5], { metalness: 0 })); praca.rotation.x = -Math.PI / 2; praca.position.set(0, 0.02, -65); praca.receiveShadow = true; scene.add(praca);
    const grande = J.torii(6.2, 7.6, { placa: "ラテケ", r: 0.32 }); grande.position.set(0, 0, -64.5); scene.add(grande);
    for (const s of [-1, 1]) { const t = J.toro(1.15); t.position.set(s * 4.6, 0, -66.5); scene.add(t); M.toros = M.toros || []; M.toros.push(t); }

    /* ---------- escadaria de pedra com o túnel de torii ---------- */
    const N = 100, z0 = L.Z_ESC0, z1 = L.Z_ESC1, run = (z0 - z1) / N, rise = L.Y_TOPO / N;
    const stepM = pbr("stone_pathway", [1.4, 0.35], { metalness: 0, color: "#e2dccf" });
    const stepGeo = new T.BoxGeometry(2.9, rise + 0.5, run + 0.02); const steps = new T.InstancedMesh(stepGeo, stepM, N);
    for (let i = 0; i < N; i++) steps.setMatrixAt(i, TRS(0, (i + 1) * rise - (rise + 0.5) / 2, z0 - (i + 0.5) * run));
    steps.receiveShadow = steps.castShadow = true; scene.add(steps);
    // muretas de pedra dos dois lados
    for (const s of [-1, 1]) { const len = Math.hypot(z0 - z1, L.Y_TOPO); const w = new T.Mesh(new T.BoxGeometry(0.45, 0.9, len), pbr("mossy_rock", [0.3, len / 2], { metalness: 0, color: "#a8a69c" }));
      w.position.set(s * 1.7, L.Y_TOPO / 2 + 0.15, (z0 + z1) / 2); w.rotation.x = Math.atan2(L.Y_TOPO, z0 - z1); w.castShadow = w.receiveShadow = true; scene.add(w); }
    const yEsc = (z) => clamp((z0 - z) / (z0 - z1), 0, 1) * L.Y_TOPO;
    M.yEsc = yEsc;
    // senbon torii: dezenas de torii vermelhos, um atrás do outro
    const pequeno = merge(J.torii(3.5, 3.7, { r: 0.12, noBase: true }));
    const tm = []; for (let z = z0 - 2.5; z > z1 + 1.5; z -= 1.25) tm.push(TRS(0, yEsc(z) - 0.05, z, 0, 1));
    scene.add(instances(pequeno, tm));
    // lanternas ao longo da subida, e no alto
    M.toros = M.toros || [];
    for (let z = z0 - 6; z > z1; z -= 9) for (const s of [-1, 1]) { const t = J.toro(0.85); t.position.set(s * 2.75, yEsc(z) + 0.1, z); scene.add(t); M.toros.push(t); }

    /* ---------- o santuário no alto ---------- */
    const YT = L.Y_TOPO;
    const cascalho = new T.Mesh(new T.PlaneGeometry(40, 40), pbr("gravel_floor", [12, 12], { metalness: 0, color: "#bdb8ae", roughnessMap: null, metalnessMap: null, roughness: 1 })); cascalho.rotation.x = -Math.PI / 2; cascalho.position.set(0, YT + 0.03, -131); cascalho.receiveShadow = true; scene.add(cascalho);
    const caminho = new T.Mesh(new T.PlaneGeometry(2.4, 22), pbr("stone_pathway", [0.6, 5.5], { metalness: 0 })); caminho.rotation.x = -Math.PI / 2; caminho.position.set(0, YT + 0.05, -122); caminho.receiveShadow = true; scene.add(caminho);
    const topoT = J.torii(4.6, 5.6, { r: 0.22, placa: "神社" }); topoT.position.set(0, YT, -114.5); scene.add(topoT);
    const hai = J.haiden({ W: 10, D: 7 }); hai.position.set(0, YT, -140); scene.add(hai); M.haiden = hai;
    for (const z of [-118, -124, -130]) for (const s of [-1, 1]) { const t = J.toro(1); t.position.set(s * 2.4, YT, z); scene.add(t); M.toros.push(t); }
    // a árvore sagrada recebe a corda; ela mesma vem do arquivo de vegetação
    M.arvoreSagrada = new T.Vector3(-11, YT, -128);

    /* ---------- trilha da floresta: pedras no chão ---------- */
    {
      const pts = []; for (let z = L.Z_PLAT1 + 6; z > L.Z_VALE - 30; z -= 2) pts.push(new T.Vector3(trilhaX(z), 0, z));
      const curve = new T.CatmullRomCurve3(pts), seg = 140, W = 2.0, pos = [], uv = [], idx = [];
      for (let i = 0; i <= seg; i++) { const t = i / seg, c = curve.getPoint(t), d = curve.getTangent(t), nx = -d.z, nz = d.x, ln = Math.hypot(nx, nz);
        for (const s of [-1, 1]) { const x = c.x + s * W / 2 * nx / ln, z = c.z + s * W / 2 * nz / ln; pos.push(x, h(x, z) + 0.06, z); uv.push(s < 0 ? 0 : 1, i * 0.5); } }
      for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const tr = new T.Mesh(g, pbr("stone_pathway", [1, 1], { metalness: 0, color: "#bdb6a8" })); tr.receiveShadow = true; scene.add(tr);
    }

    /* ---------- vale: arrozais em degraus de água ---------- */
    {
      const YV = L.Y_VALE, aguaR = new T.MeshStandardMaterial({ color: "#20282a", roughness: 0.08, metalness: 0.9, envMapIntensity: 0.55 });
      const dique = pbr("leafy_grass", [3, 0.2], { metalness: 0, color: "#a8a888" });
      M.arrozais = [];
      for (let ix = -4; ix <= 3; ix++) for (let iz = 0; iz < 4; iz++) {
        const cx = ix * 13 + 6.5, cz = L.Z_VALE - 8 - iz * 12.5; if (Math.abs(cx - trilhaX(cz)) < 5) continue;
        const y = h(cx, cz) + 0.05;
        const w = new T.Mesh(new T.PlaneGeometry(12, 11.5), aguaR); w.rotation.x = -Math.PI / 2; w.position.set(cx, y + 0.06, cz); scene.add(w);
        for (const [dx, dz, sx, sz] of [[0, 5.95, 12.6, 0.6], [0, -5.95, 12.6, 0.6], [6.25, 0, 0.6, 12.5], [-6.25, 0, 0.6, 12.5]]) { const b = new T.Mesh(new T.BoxGeometry(sx, 0.36, sz), dique); b.position.set(cx + dx, y + 0.02, cz + dz); b.receiveShadow = true; scene.add(b); }
        M.arrozais.push({ x: cx, z: cz, y: y + 0.06, cheio: (ix + iz) % 3 !== 0 });
      }
      // o arroz: touceiras de folhas finas, verdes com as pontas douradas, balançando ao vento
      const tou = (() => { const pos = [], col = [], idx = []; let v = 0; for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + 0.3, lean = 0.12 + (k % 3) * 0.06, hh = 0.5 + (k % 4) * 0.06, w = 0.012;
          const dx = Math.cos(a), dz = Math.sin(a), px = -dz * w, pz = dx * w;
          pos.push(-px, 0, -pz, px, 0, pz, dx * lean - px * 0.3, hh, dz * lean - pz * 0.3, dx * lean + px * 0.3, hh, dz * lean + pz * 0.3);
          col.push(0.26, 0.36, 0.12, 0.26, 0.36, 0.12, 0.62, 0.62, 0.26, 0.62, 0.62, 0.26); idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); v += 4; }
        const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new T.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; })();
      const arrozM = new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: 0.85 });
      const uT = { value: 0 }; M.ticks.push((t) => (uT.value = t));
      arrozM.onBeforeCompile = (sh) => { sh.uniforms.uT = uT; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uT;").replace("#include <begin_vertex>", `#include <begin_vertex>
        vec4 ip = instanceMatrix * vec4(0., 0., 0., 1.); float w = sin(uT * 1.3 + ip.x * 0.35 + ip.z * 0.2) * 0.5 + sin(uT * 2.1 + ip.x * 0.9) * 0.2;
        transformed.x += w * 0.09 * position.y * position.y * 4.; transformed.z += w * 0.04 * position.y;`); };
      const pts = [];
      for (const a of M.arrozais) { if (!a.cheio) continue; for (let x = -5.6; x <= 5.6; x += M.leve ? 0.7 : 0.48) for (let z = -5.3; z <= 5.3; z += M.leve ? 0.7 : 0.48) pts.push(TRS(a.x + x + (rnd() - 0.5) * 0.08, a.y - 0.02, a.z + z + (rnd() - 0.5) * 0.08, rnd() * 6.28, 0.85 + rnd() * 0.35)); }
      const arroz = new T.InstancedMesh(tou, arrozM, pts.length); pts.forEach((m, i) => arroz.setMatrixAt(i, m)); arroz.receiveShadow = true; arroz.frustumCulled = false; scene.add(arroz);
    }
    // a casa de fazenda, de frente para a trilha
    const casa = J.minka({ W: 11, D: 7 }); casa.position.set(-34, h(-34, -226) - 0.1, -226); casa.rotation.y = Math.PI / 2; scene.add(casa); M.casa = casa;

    /* ---------- o torii dentro do lago ---------- */
    const lagoT = J.torii(9, 12, { r: 0.5, noBase: true, placa: "水" }); lagoT.position.set(0, L.Y_AGUA - 1.2, L.LAGO.z + 6); scene.add(lagoT); M.toriiLago = lagoT;
    // reflexo: uma cópia de cabeça para baixo debaixo da água semitransparente
    // píer de madeira até a água
    const pierM = pbr("stair_planks", [1, 6], { metalness: 0, color: "#a89880" });
    const pz0 = L.LAGO.z + L.LAGO.rz - 2, pier = new T.Mesh(new T.BoxGeometry(2.4, 0.18, 22), pierM); pier.position.set(0, L.Y_AGUA + 0.55, pz0 - 9); pier.castShadow = pier.receiveShadow = true; scene.add(pier);
    for (let z = pz0 + 1; z > pz0 - 20; z -= 3) for (const s of [-1, 1]) { const p = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 2.6, 8), J.MADEIRA_ESC()); p.position.set(s * 1.1, L.Y_AGUA - 0.6, z); scene.add(p); }
    M.pierFim = new T.Vector3(0, L.Y_AGUA + 0.64, pz0 - 19.5);
  });
})();
