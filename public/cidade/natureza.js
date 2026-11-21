/* Vegetação. Ao longe, as árvores são fotos de árvores reais (renderizadas a partir dos modelos completos do
   Poly Haven) que sempre se viram para a câmera; perto do caminho, são os próprios modelos 3D. */
(() => {
  const M = (window.MUNDO = window.MUNDO || {});
  M.builders = M.builders || [];
  M.builders.push(async (M) => {
    const { T, scene, h, L, rnd, load, TRS } = M;
    const meta = await fetch("/cidade/tex/arvores.json").then((r) => r.json());
    const atlas = M.texL.load("/cidade/tex/arvores.webp"); atlas.encoding = T.sRGBEncoding; atlas.anisotropy = 4;
    const byName = Object.fromEntries(meta.map((m) => [m.n, m]));

    /* ---------- árvores-imagem (billboards cilíndricos), todas numa única malha instanciada ---------- */
    const sun = M.sun;
    const U = T.UniformsUtils.merge([T.UniformsLib.fog, { map: { value: null }, uTime: { value: 0 }, uSun: { value: new T.Color("#ffb27a") }, uSky: { value: new T.Color("#8a86a8") } }]);
    U.map.value = atlas;
    const bbMat = new T.ShaderMaterial({
      uniforms: U, fog: true, alphaToCoverage: true,
      vertexShader: `attribute vec4 aUV; attribute vec4 aTint; varying vec2 vUv; varying vec4 vTint; varying float vH; uniform float uTime;
        #include <fog_pars_vertex>
        void main(){ vec3 inst = (instanceMatrix * vec4(0.,0.,0.,1.)).xyz; float sx = length(instanceMatrix[0].xyz), sy = length(instanceMatrix[1].xyz);
          vec3 to = cameraPosition - inst; to.y = 0.; vec3 right = normalize(vec3(to.z, 0., -to.x));
          float sway = sin(uTime * 0.7 + inst.x * 0.3 + inst.z * 0.2) * 0.012 * position.y * position.y * sy;
          vec3 wp = inst + right * (position.x * sx + sway) + vec3(0., position.y * sy, 0.);
          vUv = mix(aUV.xy, aUV.zw, uv); vTint = aTint; vH = position.y;
          vec4 mvPosition = viewMatrix * vec4(wp, 1.); gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform sampler2D map; uniform vec3 uSun, uSky; varying vec2 vUv; varying vec4 vTint; varying float vH;
        #include <fog_pars_fragment>
        void main(){ vec4 c = texture2D(map, vUv); if (c.a < 0.42) discard;
          vec3 col = c.rgb;
          if (vTint.a > 0.5) { float l = dot(col, vec3(0.3, 0.59, 0.11)); col = vTint.rgb * (0.35 + 1.5 * l); } else col *= vTint.rgb;
          // luz do fim de tarde: o alto da copa pega o sol, a base fica na sombra azulada do céu
          col *= mix(uSky * 0.55, uSun * 0.95, smoothstep(0.05, 1.0, vH));
          gl_FragColor = vec4(col, 1.);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
          #include <fog_fragment>
        }`,
    });
    M.ticks.push((t) => { U.uTime.value = t; });
    const bb = []; // {n, x, y, z, s, tint:[r,g,b,mode]}
    const conif = ["pine_1", "pine_2", "pine_0", "fir_0", "fir_1", "fir_2"], folh = ["island_tree_01_0", "island_tree_02_0", "island_tree_01_0", "tree_small_02_0"];
    const verdeC = () => { const k = 0.62 + rnd() * 0.22; return [k * 0.82, k * 0.95, k * 0.8, 0]; };
    const verdeF = () => { const k = 0.7 + rnd() * 0.25; return [k * 0.9, k, k * 0.85, 0]; };
    const pinkSak = () => [0.95 + rnd() * 0.05, 0.5 + rnd() * 0.1, 0.62 + rnd() * 0.08, 1];
    const momiji = () => (rnd() < 0.5 ? [0.95, 0.32 + rnd() * 0.15, 0.12, 1] : [0.98, 0.62 + rnd() * 0.15, 0.18, 1]);
    function addBB(n, x, z, sc, tint, yoff = 0) { const m = byName[n]; if (!m) return; bb.push({ m, x, y: h(x, z) - 0.25 + yoff, z, sx: m.w * sc, sy: m.h * sc, tint }); }
    const longeDoCaminho = (x, z) => {
      if (z > -63) return Math.abs(x) > 16; // atrás dos prédios da rua
      if (z <= L.Z_ESC0 + 4 && z >= L.Z_ESC1 - 2 && Math.abs(x) < 5.5) return false; // escadaria
      if (z < L.Z_ESC1 + 1 && z > L.Z_PLAT1 + 1 && Math.abs(x) < 23 && !(Math.abs(x) > 19)) return false; // pátio do santuário
      if (z <= L.Z_PLAT1 + 3 && z > L.Z_VALE - 30 && Math.abs(x - M.trilhaX(z)) < 4.2) return false; // trilha
      const e = Math.pow((x - L.LAGO.x) / L.LAGO.rx, 2) + Math.pow((z - L.LAGO.z) / L.LAGO.rz, 2); if (e < 1.12) return false; // lago
      if (z < L.Z_VALE + 2 && z > L.Z_VALE - 58 && Math.abs(x) < 58) return false; // arrozais
      if (Math.hypot(x + 34, z + 226) < 12) return false; // casa
      return true;
    };
    function espalhar(n, x0, x1, z0, z1, escolhe, dens = 1) {
      for (let i = 0; i < n * (M.leve ? 0.6 : 1); i++) { const x = x0 + rnd() * (x1 - x0), z = z1 + rnd() * (z0 - z1); if (!longeDoCaminho(x, z)) continue; escolhe(x, z); }
    }
    // o morro da escadaria e do santuário: floresta escura de coníferas, com cerejeiras perto do alto
    espalhar(1300, -150, 150, -62, -152, (x, z) => { const ax = Math.abs(x); if (ax < 30 && z < -100 && rnd() < 0.18) addBB("jacaranda_tree_0", x, z, 0.38 + rnd() * 0.12, pinkSak());
      else if (rnd() < 0.12) addBB(folh[(rnd() * 4) | 0], x, z, 1.5 + rnd(), verdeF()); else addBB(conif[(rnd() * 6) | 0], x, z, 0.85 + rnd() * 0.45, verdeC()); });
    // a floresta que desce para o vale, com bordos vermelhos e amarelos no meio
    espalhar(1500, -160, 160, -150, -212, (x, z) => { const r = rnd(); if (r < 0.1) addBB("tree_small_02_0", x, z, 1.6 + rnd() * 0.8, momiji()); else if (r < 0.3) addBB(folh[(rnd() * 3) | 0], x, z, 1.6 + rnd(), verdeF()); else addBB(conif[(rnd() * 6) | 0], x, z, 0.9 + rnd() * 0.5, verdeC()); });
    // encostas do vale e morros atrás do lago
    espalhar(1300, -260, 260, -205, -380, (x, z) => { const r = rnd(); if (Math.abs(x) < 70 && z > -268 && r < 0.5) return; if (r < 0.08) addBB("jacaranda_tree_0", x, z, 0.35 + rnd() * 0.1, pinkSak()); else if (r < 0.4) addBB(folh[(rnd() * 3) | 0], x, z, 2 + rnd() * 1.2, verdeF()); else addBB(conif[(rnd() * 6) | 0], x, z, 1 + rnd() * 0.5, verdeC()); });
    espalhar(1000, -500, 500, -340, -560, (x, z) => addBB(conif[(rnd() * 6) | 0], x, z, 1.1 + rnd() * 0.6, verdeC()));
    // atrás dos prédios da rua: copas de árvores de bairro
    espalhar(160, -60, 60, 30, -62, (x, z) => addBB(folh[(rnd() * 3) | 0], x, z, 1.8 + rnd(), verdeF()));
    // beira do lago: cerejeiras
    for (let a = 0; a < Math.PI * 2; a += 0.22) { if (Math.abs(Math.sin(a)) > 0.75 && Math.cos(a) > 0) continue; const x = L.LAGO.x + Math.cos(a) * L.LAGO.rx * (1.2 + rnd() * 0.15), z = L.LAGO.z + Math.sin(a) * L.LAGO.rz * (1.22 + rnd() * 0.15); if (z > L.LAGO.z + L.LAGO.rz * 0.9 && Math.abs(x) < 6) continue; addBB("jacaranda_tree_0", x, z, 0.3 + rnd() * 0.12, pinkSak()); }
    {
      const geo = new T.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
      const ig = geo;
      const aUV = new Float32Array(bb.length * 4), aT = new Float32Array(bb.length * 4);
      bb.forEach((b, i) => { aUV.set([b.m.u0, b.m.v0, b.m.u1, b.m.v1], i * 4); aT.set(b.tint, i * 4); });
      ig.setAttribute("aUV", new T.InstancedBufferAttribute(aUV, 4)); ig.setAttribute("aTint", new T.InstancedBufferAttribute(aT, 4));
      const im = new T.InstancedMesh(ig, bbMat, bb.length); const m4 = new T.Matrix4();
      bb.forEach((b, i) => { m4.makeScale(b.sx, b.sy, 1).setPosition(b.x, b.y, b.z); im.setMatrixAt(i, m4); });
      im.frustumCulled = false; scene.add(im); M.arvoresBB = im; console.log("árvores-imagem", bb.length);
    }

    /* ---------- árvores 3D perto do caminho ---------- */
    const GM = {};
    const [sak, mom, isl1, isl2] = await Promise.all(["sakura", "momiji", "island_tree_01", "island_tree_02"].map(load));
    function recolor(model, re, color) {
      model.traverse((o) => { if (!o.isMesh) return; const m = o.material; if (!re.test(m.name || "")) return; const nm = m.clone(); nm.color = new T.Color(color);
        const img = m.map && m.map.image; if (img) { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height), a = d.data; for (let i = 0; i < a.length; i += 4) { const l = 0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2]; const v = Math.min(255, 70 + l * 1.6); a[i] = a[i + 1] = a[i + 2] = v; } g.putImageData(d, 0, 0); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.flipY = m.map.flipY; nm.map = t; }
        o.material = nm; });
      return model;
    }
    const sombra = (o) => o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.material.side = T.DoubleSide; } });
    function planta(model, x, z, s, ry = rnd() * 6.28, yoff = 0) { if (!model) return null; const o = model.clone(true); o.position.set(x, h(x, z) - 0.15 + yoff, z); o.scale.setScalar(s); o.rotation.y = ry; scene.add(o); return o; }
    if (sak) { recolor(sak, /leaves|branches/, "#f6c4d2"); sombra(sak); }
    if (mom) { recolor(mom, /leaves/, "#d8502a"); sombra(mom); }
    if (isl1) sombra(isl1); if (isl2) sombra(isl2);
    const YT = L.Y_TOPO;
    // a árvore sagrada: a grande árvore antiga do santuário, abraçada pela corda
    if (isl1) { const o = planta(isl1, M.arvoreSagrada.x, M.arvoreSagrada.z, 2.6, 2.2, 0.1); M.sagrada = o;
      // mede o tronco na altura da corda para a corda abraçar o tronco de verdade
      const yC = o.position.y + 1.9; let cx = 0, cz = 0, n = 0; const pts = []; o.updateMatrixWorld(true); const v = new T.Vector3();
      try { o.traverse((m) => { if (!m.isMesh || /leaves|branches/.test(m.material.name || "")) return; const p = m.geometry.attributes.position; const step = Math.max(1, Math.floor(p.count / 60000));
        for (let i = 0; i < p.count; i += step) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); if (Math.abs(v.y - yC) < 0.12) { pts.push(v.x, v.z); cx += v.x; cz += v.z; n++; } } }); } catch (e) { n = 0; }
      let c = new T.Vector3(o.position.x, yC, o.position.z), r = 1.1;
      if (n > 10) { cx /= n; cz /= n; let rr = 0; for (let i = 0; i < pts.length; i += 2) rr = Math.max(rr, Math.hypot(pts[i] - cx, pts[i + 1] - cz)); c.set(cx, yC, cz); r = Math.min(2.2, rr * 0.92 + 0.06); }
      const frente = new T.Vector3(1, 0, 0.6).normalize();
      scene.add(M.J.shimenawaAnel(c, r, 5, frente)); M.cordaSagrada = { c, r }; }
    // cerejeiras no pátio do santuário
    if (sak) { planta(sak, 13, -126, 0.42, 1.0); planta(sak, 15.5, -143, 0.36, 2.5); planta(sak, -16, -146, 0.38, 4.0); planta(sak, 6.5, -66.5, 0.3, 0.5); }
    // bordos vermelhos ao longo da trilha da floresta
    if (mom) for (let z = -156; z > -200; z -= 7) { const s = rnd() < 0.5 ? -1 : 1; planta(mom, M.trilhaX(z) + s * (4.5 + rnd() * 2), z, 1.6 + rnd() * 0.6); }
    // árvores grandes no vale, perto da casa e do lago
    if (isl2) { planta(isl2, -44, -214, 2.6); planta(isl2, 30, -268, 2.4); planta(isl2, -40, -262, 2.2); }
    if (isl1) { planta(isl1, -26, -240, 1.7); planta(isl1, 40, -212, 1.9); }
    if (sak) { planta(sak, -12, -262, 0.32, 1.2); planta(sak, 14, -264, 0.3, 3.1); }

    /* ---------- chão vivo: samambaias, capim, arbustos, pedras com musgo, tocos (modelos instanciados) ---------- */
    function instanciar(model, lista, sombraLanca = false) {
      if (!model || !lista.length) return; model.updateMatrixWorld(true); const pm = new T.Matrix4();
      model.traverse((o) => { if (!o.isMesh) return; const rel = o.matrixWorld.clone(); const im = new T.InstancedMesh(o.geometry, o.material, lista.length);
        o.material.side = T.DoubleSide; lista.forEach((m, i) => im.setMatrixAt(i, pm.multiplyMatrices(m, rel)));
        im.castShadow = sombraLanca; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); });
    }
    const leve = M.leve;
    const [fern, grass1, grass2, shrub2, shrub4, rock1, rock2, boulder, stump] = await Promise.all(["fern_02", "grass_medium_01", "grass_medium_02", "shrub_02", "shrub_04", "rock_moss_set_01", "rock_moss_set_02", "boulder_01", "tree_stump_01"].map(load));
    const em = (n, gen) => { const out = []; for (let i = 0, tries = 0; i < (leve ? n >> 1 : n) && tries < n * 6; tries++) { const r = gen(); if (r) { out.push(TRS(r[0], h(r[0], r[1]) - 0.05, r[1], rnd() * 6.28, r[2])); i++; } } return out; };
    const nearPath = (spread, z0, z1, minD) => () => { const z = z1 + rnd() * (z0 - z1); const x = (z < L.Z_ESC0 && z > L.Z_ESC1 ? 0 : M.trilhaX(z)) + (rnd() < 0.5 ? -1 : 1) * (minD + rnd() * spread); return longeDoCaminho(x, z) || Math.abs(x) > 2.2 ? [x, z] : null; };
    // ao lado da escadaria e da trilha
    instanciar(fern, em(150, () => { const r = nearPath(7, L.Z_ESC0 - 2, L.Z_ESC1, 2.3)(); return r && [r[0], r[1], 0.9 + rnd() * 0.8]; }).concat(em(170, () => { const r = nearPath(9, L.Z_PLAT1, L.Z_VALE - 10, 1.4)(); return r && [r[0], r[1], 0.9 + rnd() * 0.9]; })));
    instanciar(shrub2, em(40, () => { const r = nearPath(10, L.Z_ESC0 - 2, L.Z_VALE, 3)(); return r && [r[0], r[1], 0.8 + rnd() * 0.6]; }), true);
    instanciar(shrub4, em(40, () => { const r = nearPath(12, L.Z_ESC0 - 2, L.Z_VALE, 3)(); return r && [r[0], r[1], 0.8 + rnd() * 0.6]; }), true);
    instanciar(rock1, em(26, () => { const r = nearPath(10, L.Z_ESC0 - 4, L.Z_VALE, 2.6)(); return r && [r[0], r[1], 0.7 + rnd() * 0.8]; }), true);
    instanciar(rock2, em(22, () => { const r = nearPath(12, L.Z_PLAT1, L.Z_VALE - 5, 2.4)(); return r && [r[0], r[1], 0.8 + rnd()]; }), true);
    instanciar(boulder, em(8, () => { const r = nearPath(14, L.Z_PLAT1 - 5, L.Z_VALE, 5)(); return r && [r[0], r[1], 0.5 + rnd() * 0.5]; }), true);
    instanciar(stump, em(10, () => { const r = nearPath(9, L.Z_PLAT1, L.Z_VALE, 2.5)(); return r && [r[0], r[1], 0.8 + rnd() * 0.5]; }), true);
    // capim nas bordas dos arrozais, na beira do lago e no vale
    instanciar(grass2, em(260, () => { const x = (rnd() - 0.5) * 130, z = L.Z_VALE + 4 - rnd() * 70; if (Math.abs(x) < 56 && z < L.Z_VALE - 1 && z > L.Z_VALE - 56) { const lx = ((x - 6.5) % 13 + 13) % 13, lz = (((L.Z_VALE - 8 - z) + 6.25) % 12.5 + 12.5) % 12.5; if (Math.min(lx, 13 - lx) > 0.7 && Math.min(lz, 12.5 - lz) > 0.7) return null; } return [x, z, 0.8 + rnd() * 0.6]; }));
    instanciar(grass1, em(70, () => { const a = rnd() * 6.28, x = L.LAGO.x + Math.cos(a) * L.LAGO.rx * (1.02 + rnd() * 0.12), z = L.LAGO.z + Math.sin(a) * L.LAGO.rz * (1.02 + rnd() * 0.12); return Math.abs(x) < 3 && z > L.LAGO.z ? null : [x, z, 0.7 + rnd() * 0.5]; }));
  });
})();
