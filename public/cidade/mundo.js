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
  const L = M.L = { Z_ESC0: -70, Z_ESC1: -112, Y_TOPO: 18, Z_PLAT1: -150, Z_VALE: -205, Y_VALE: 3, LAGO: { x: 0, z: -305, rx: 74, rz: 42 }, Y_AGUA: 2.0, KOSATSU: { x: 6.2, z: -101 } };
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
    // o terraço do mural dos certificados, ao lado da escadaria, é plano
    { const K = L.KOSATSU, d = Math.hypot(Math.max(0, Math.abs(x - K.x) - 2.6), Math.max(0, Math.abs(z - K.z) - 2.1)); if (d < 5) y = mix(L.Y_TOPO * (L.Z_ESC0 - K.z) / (L.Z_ESC0 - L.Z_ESC1) - 0.25, y, smooth(0, 4, d)); }
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
  /* cópias de um modelo espalhadas pelo mapa, agrupadas em pedaços de `cell` metros: cada pedaço é uma malha
     instanciada com a sua própria esfera de limite, então o que está fora da tela nem é processado.
     opt.sombra: projeta sombra; opt.camada 1: detalhe que não entra no reflexo do lago. */
  M.instPedacos = (model, mats4, opt = {}) => {
    const T = M.T, out = new T.Group(); if (!model || !mats4.length) return out;
    model.updateMatrixWorld(true); const cell = opt.cell || 40, chunks = new Map(), pm = new T.Matrix4(), c = new T.Vector3();
    for (const m of mats4) { const k = Math.floor(m.elements[12] / cell) + ":" + Math.floor(m.elements[14] / cell); if (!chunks.has(k)) chunks.set(k, []); chunks.get(k).push(m); }
    model.traverse((o) => {
      if (!o.isMesh) return; const g = o.geometry, rel = o.matrixWorld.clone(); if (!g.boundingSphere) g.computeBoundingSphere();
      for (const list of chunks.values()) {
        const cg = new T.BufferGeometry(); if (g.index) cg.setIndex(g.index); for (const k in g.attributes) cg.setAttribute(k, g.attributes[k]);
        const mats = list.map((m) => new T.Matrix4().multiplyMatrices(m, rel)); const ctrs = mats.map((m) => g.boundingSphere.center.clone().applyMatrix4(m));
        c.set(0, 0, 0); ctrs.forEach((p) => c.add(p)); c.divideScalar(ctrs.length);
        let R = 0; ctrs.forEach((p, i) => { R = Math.max(R, p.distanceTo(c) + g.boundingSphere.radius * mats[i].getMaxScaleOnAxis()); });
        cg.boundingSphere = new T.Sphere(c.clone(), R);
        const im = new T.InstancedMesh(cg, o.material, mats.length); mats.forEach((m, i) => im.setMatrixAt(i, m));
        im.frustumCulled = true; im.castShadow = !!opt.sombra; im.receiveShadow = true; if (opt.camada) im.layers.set(opt.camada); if (opt.longe) im.userData.longe = opt.longe; out.add(im); M.longe.push(im);
      }
    });
    M.scene.add(out); return out;
  };

  M.builders = M.builders || [];
  M.builders.push(async (M) => {
    const { T, scene, pbr, tx, rnd } = M;
    const J = (M.J = M.japao(M));
    const est = new T.Group(); // tudo o que é parado vira poucas malhas no fim (M.juntar)

    /* ---------- terreno: perto (detalhado) e longe (montanhas) ---------- */
    function terreno(x0, x1, z0, z1, step, far) {
      const nx = Math.round((x1 - x0) / step), nz = Math.round((z0 - z1) / step);
      const geo = new T.PlaneGeometry(x1 - x0, z0 - z1, nx, nz); geo.rotateX(-Math.PI / 2); geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
      const p = geo.attributes.position, uv = geo.attributes.uv, n = p.count, splat = new Float32Array(n * 3), col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const x = p.getX(i), z = p.getZ(i); let y = h(x, z);
        if (far && Math.abs(x) < 165 && z < 40 && z > -176) y -= 6; // por baixo do terreno de perto
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
    terreno(-165, 165, 40, -176, 2, false); // (o terreno de perto acaba pouco depois do platô do torii)
    const far = terreno(-1300, 1300, 1100, -1500, 26, true); far.receiveShadow = false;

    /* ---------- água ---------- */
    /* o lago é um espelho de verdade: a cena é desenhada de novo, vista de baixo da água, numa textura; a água
       mistura esse reflexo com a cor funda, ondulando de leve (como o Reflector do three.js, escrito aqui) */
    function espelho(geo) {
      // o reflexo é desenhado em baixa resolução (a água ondula e borra mesmo) e só a cada dois quadros
      const k = 0.4, tam = () => [Math.max(256, Math.min(800, innerWidth * k)), Math.max(160, Math.min(480, innerHeight * k))];
      /* a textura guarda a cor já pronta para a tela (sRGB), como a tela: assim o reflexo usa os mesmos shaders da cena
         (desenhar numa textura comum pediria uma segunda versão de cada um). O formato fica RGBA8 comum e a água
         desfaz o sRGB ao ler (pow 2.2) */
      const rt = new T.WebGLRenderTarget(...tam()); rt.texture.encoding = T.sRGBEncoding; rt.texture.internalFormat = "RGBA8"; rt.isXRRenderTarget = true;
      addEventListener("resize", () => rt.setSize(...tam()));
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
            vec3 r = pow(texture2DProj(tRefl, vR + vec4(d * vR.w, 0., 0.)).rgb, vec3(2.2));
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
      let ocupado = false, vez = 0;
      mesh.onBeforeRender = (renderer, sc, camera) => {
        if (ocupado) return; mat.uniforms.uT.value = performance.now() / 1000; if (vez++ & 1) return;
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
        renderer.setRenderTarget(rt); renderer.state.buffers.depth.setMask(true); if (renderer.autoClear === false) renderer.clear(); renderer.render(sc, vc);
        renderer.shadowMap.autoUpdate = sau; renderer.setRenderTarget(prev); mesh.visible = true; ocupado = false;
      };
      return mesh;
    }
    /* Ato 1 termina no torii do topo da escadaria (a porta): o lago, o vale e o santuário saíram (docs/plano-tres-atos.md) */
    if (false) { const lago = espelho(new T.CircleGeometry(1, 64)); lago.rotation.x = -Math.PI / 2; lago.scale.set(L.LAGO.rx * 1.45, L.LAGO.rz * 1.45, 1); lago.position.set(L.LAGO.x, L.Y_AGUA, L.LAGO.z); scene.add(lago); M.lago = lago; }

    /* ---------- praça e o grande torii ---------- */
    const praca = new T.Mesh(new T.PlaneGeometry(14, 10), pbr("stone_pathway", [3.5, 2.5], { metalness: 0 })); praca.rotation.x = -Math.PI / 2; praca.position.set(0, 0.02, -65); praca.receiveShadow = true; est.add(praca);
    const grande = J.torii(6.2, 7.6, { placa: "ラテケ", r: 0.32 }); grande.position.set(0, 0, -64.5); est.add(grande);
    for (const s of [-1, 1]) { const t = J.toro(1.15); t.position.set(s * 4.6, 0, -66.5); est.add(t); M.toros = M.toros || []; M.toros.push(t); }

    /* ---------- escadaria de pedra com o túnel de torii ---------- */
    const N = 100, z0 = L.Z_ESC0, z1 = L.Z_ESC1, run = (z0 - z1) / N, rise = L.Y_TOPO / N;
    const stepM = pbr("stone_pathway", [1.4, 0.35], { metalness: 0, color: "#e2dccf" });
    const stepGeo = new T.BoxGeometry(2.9, rise + 0.5, run + 0.02); const steps = new T.InstancedMesh(stepGeo, stepM, N);
    for (let i = 0; i < N; i++) steps.setMatrixAt(i, TRS(0, (i + 1) * rise - (rise + 0.5) / 2, z0 - (i + 0.5) * run));
    steps.receiveShadow = steps.castShadow = true; scene.add(steps);
    // muretas de pedra dos dois lados
    for (const s of [-1, 1]) { const len = Math.hypot(z0 - z1, L.Y_TOPO); const w = new T.Mesh(new T.BoxGeometry(0.45, 0.9, len), pbr("mossy_rock", [0.3, len / 2], { metalness: 0, color: "#a8a69c" }));
      w.position.set(s * 1.7, L.Y_TOPO / 2 + 0.15, (z0 + z1) / 2); w.rotation.x = Math.atan2(L.Y_TOPO, z0 - z1); w.castShadow = w.receiveShadow = true; est.add(w); }
    const yEsc = (z) => clamp((z0 - z) / (z0 - z1), 0, 1) * L.Y_TOPO;
    M.yEsc = yEsc;
    // três torii espaçados na subida (as cerejeiras dos lados vêm do arquivo de vegetação)
    const pequeno = merge(J.torii(3.7, 4.1, { r: 0.14, noBase: true }));
    scene.add(instances(pequeno, [-77, -92, -107].map((z) => TRS(0, yEsc(z) - 0.05, z))));
    // lanternas ao longo da subida
    M.toros = M.toros || []; M.torosEscada = [];
    for (let z = z0 - 6; z > z1; z -= 7.5) for (const s of [-1, 1]) { if (s > 0 && Math.abs(z - L.KOSATSU.z) < 3.5) continue; const t = J.toro(0.85); t.position.set(s * 2.75, yEsc(z) + 0.1, z); est.add(t); M.toros.push(t); M.torosEscada.push(t); }
    // o terraço de pedra ao lado da escada, onde fica o mural dos certificados (o mural vem de conteudo.js)
    { const K = L.KOSATSU, yk = yEsc(K.z); K.y = yk + 0.12;
      const muro = new T.Mesh(new T.BoxGeometry(5.6, 2.4, 4.6), pbr("japanese_stone_wall", [2.2, 1], { metalness: 0 })); muro.position.set(K.x + 0.3, yk - 1.08, K.z); muro.receiveShadow = true; est.add(muro);
      const piso = new T.Mesh(new T.PlaneGeometry(5.6, 4.6), pbr("stone_pathway", [1.4, 1.15], { metalness: 0 })); piso.rotation.x = -Math.PI / 2; piso.position.set(K.x + 0.3, yk + 0.125, K.z); piso.receiveShadow = true; est.add(piso);
      // a passagem de pedra que liga o degrau ao terraço
      const pas = new T.Mesh(new T.BoxGeometry(2.1, 0.3, 1.5), pbr("stone_pathway", [0.4, 0.4], { metalness: 0 })); pas.position.set(2.7, yk - 0.03, K.z); pas.receiveShadow = true; est.add(pas); }

    /* ---------- o santuário no alto ---------- */
    const YT = L.Y_TOPO;
    // (o cascalho, o caminho de pedra, o santuário e as lanternas do pátio saíram)
    const topoT = J.torii(4.6, 5.6, { r: 0.22, placa: "神社" }); topoT.position.set(0, YT, -114.5); est.add(topoT); M.toriiPorta = topoT; // a porta para o Ato 2

    scene.add(est); M.juntar(est, 30);
  });
})();
