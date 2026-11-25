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
    const U = (M.bbU = T.UniformsUtils.merge([T.UniformsLib.fog, { map: { value: null }, uTime: { value: 0 }, uSun: { value: new T.Color("#ffb27a") }, uSky: { value: new T.Color("#8a86a8") } }]));
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
      if (Math.hypot(x - L.KOSATSU.x, z - L.KOSATSU.z) < 7) return false; // o terraço do mural
      if (z < L.Z_ESC1 + 1 && z > L.Z_PLAT1 + 1 && Math.abs(x) < 23 && !(Math.abs(x) > 19)) return false; // pátio do santuário
      if (z <= L.Z_PLAT1 + 3 && z > L.Z_VALE - 30 && Math.abs(x - M.trilhaX(z)) < 4.2) return false; // trilha
      const e = Math.pow((x - L.LAGO.x) / L.LAGO.rx, 2) + Math.pow((z - L.LAGO.z) / L.LAGO.rz, 2); if (e < 1.12) return false; // lago
      if (z < L.Z_VALE + 2 && z > L.Z_VALE - 58 && Math.abs(x) < 58) return false; // arrozais
      if (Math.hypot(x + 34, z + 226) < 12) return false; // casa
      return true;
    };
    function espalhar(n, x0, x1, z0, z1, escolhe, dens = 1) {
      for (let i = 0; i < n; i++) { const x = x0 + rnd() * (x1 - x0), z = z1 + rnd() * (z0 - z1); if (!longeDoCaminho(x, z)) continue; escolhe(x, z); }
    }
    // o morro da escadaria e do santuário: floresta escura de coníferas, com cerejeiras perto do alto
    espalhar(1300, -150, 150, -62, -152, (x, z) => { const ax = Math.abs(x); if (ax < 28 && rnd() < (z < -100 ? 0.3 : 0.4)) addBB("jacaranda_tree_0", x, z, 0.34 + rnd() * 0.12, pinkSak());
      else if (rnd() < 0.12) addBB(folh[(rnd() * 4) | 0], x, z, 1.5 + rnd(), verdeF()); else addBB(conif[(rnd() * 6) | 0], x, z, 0.85 + rnd() * 0.45, verdeC()); });
    // a floresta que desce para o vale, com bordos vermelhos e amarelos no meio
    espalhar(1500, -160, 160, -150, -212, (x, z) => { const r = rnd(); if (r < 0.1) addBB("tree_small_02_0", x, z, 1.6 + rnd() * 0.8, momiji()); else if (r < 0.3) addBB(folh[(rnd() * 3) | 0], x, z, 1.6 + rnd(), verdeF()); else addBB(conif[(rnd() * 6) | 0], x, z, 0.9 + rnd() * 0.5, verdeC()); });
    // encostas do vale e morros atrás do lago
    espalhar(1300, -260, 260, -205, -380, (x, z) => { const r = rnd(); if (Math.abs(x) < 70 && z > -268 && r < 0.5) return; if (r < 0.08) addBB("jacaranda_tree_0", x, z, 0.35 + rnd() * 0.1, pinkSak()); else if (r < 0.4) addBB(folh[(rnd() * 3) | 0], x, z, 2 + rnd() * 1.2, verdeF()); else addBB(conif[(rnd() * 6) | 0], x, z, 1 + rnd() * 0.5, verdeC()); });
    espalhar(1000, -500, 500, -340, -560, (x, z) => addBB(conif[(rnd() * 6) | 0], x, z, 1.1 + rnd() * 0.6, verdeC()));
    // atrás dos prédios da rua: copas de árvores de bairro
    espalhar(160, -60, 60, 30, -62, (x, z) => addBB(folh[(rnd() * 3) | 0], x, z, 1.8 + rnd(), verdeF()));
    for (const [x, z] of [[-48, -208], [47, -231], [-28, -214], [-62, -240], [60, -212]]) addBB("jacaranda_tree_0", x, z, 0.32 + rnd() * 0.06, pinkSak());
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
      im.frustumCulled = false; scene.add(im);
    }

    /* ---------- árvores 3D perto do caminho (versões leves, instanciadas por pedaços do mapa) ---------- */
    const [sak, mom, isl1, isl2] = await Promise.all(["sakura", "momiji", "island_tree_01", "island_tree_02"].map(load));
    function recolor(model, re, color) {
      model.traverse((o) => { if (!o.isMesh) return; const m = o.material; if (!re.test(m.name || "")) return; const nm = m.clone(); nm.color = new T.Color(color);
        const img = m.map && m.map.image; if (img) { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height), a = d.data; for (let i = 0; i < a.length; i += 4) { const l = 0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2]; const v = Math.min(255, 70 + l * 1.6); a[i] = a[i + 1] = a[i + 2] = v; } g.putImageData(d, 0, 0); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.flipY = m.map.flipY; nm.map = t; }
        o.material = nm; });
      return model;
    }
    const duplaFace = (o) => o && o.traverse((m) => { if (m.isMesh) m.material.side = T.DoubleSide; });
    if (sak) recolor(sak, /leaves|branches/, "#f6c4d2"); if (mom) recolor(mom, /leaves/, "#d8502a");
    [sak, mom, isl1, isl2].forEach(duplaFace);
    const pos = (x, z, s, ry = rnd() * 6.28) => TRS(x, h(x, z) - 0.15, z, ry, s);
    const YT = L.Y_TOPO;
    // cerejeiras 3D onde a câmera passa perto: dos dois lados da escadaria (um arco rosa sobre os degraus), na praça e no pátio
    const S = [];
    for (let z = L.Z_ESC0 - 2.5, k = 0; z > L.Z_ESC1 + 1; z -= 6.2, k++) for (const sd of [-1, 1]) { const zz = z + sd * 1.5 + (rnd() - 0.5); const xx = sd * (5.4 + rnd() * 1.2), sc = 0.26 + rnd() * 0.05; const pp = pos(xx, zz, sc); if (Math.hypot(xx - L.KOSATSU.x, zz - L.KOSATSU.z) > 4.2) S.push(pp); }
    for (const [x, z, sc] of [[6.6, -66.8, 0.3], [-7, -67.6, 0.28], [13, -126, 0.42], [15.5, -143, 0.36], [-16, -146, 0.38], [-14.5, -117, 0.33], [12.5, -116, 0.33]]) S.push(pos(x, z, sc));
    if (sak) sak.traverse((o) => { if (o.isMesh && /leaves/.test(o.material.name || "")) o.userData.soFolhas = true; });
    const semFolhas = sak && sak.clone(true); if (semFolhas) { const fora = []; semFolhas.traverse((o) => { if (o.userData.soFolhas) fora.push(o); }); fora.forEach((o) => o.parent.remove(o)); }
    M.instPedacos(semFolhas, S, { sombra: true, longe: 170 });
    /* a copa florida: o modelo leve tem poucas folhas, então cada cerejeira ganha nuvens de flores (pontos com uma
       textura de flores desenhada aqui) espalhadas onde estão as folhas dela. Quase não pesa e deixa a copa cheia. */
    if (sak) {
      const flor = M.canvasTex(256, 256, (c, W, Hh) => { c.clearRect(0, 0, W, Hh); const cores = ["#ffe6ee", "#f9c2d3", "#f4a9c0", "#fbd6e1", "#ee98b2", "#fff4f7"];
        const nucleos = []; for (let k = 0; k < 6; k++) nucleos.push([W / 2 + (rnd() - 0.5) * 120, Hh / 2 + (rnd() - 0.5) * 100, 34 + rnd() * 26]);
        for (let k = 0; k < 900; k++) { const nb = nucleos[(rnd() * nucleos.length) | 0], a = rnd() * 6.28, r = Math.sqrt(rnd()) * nb[2], x = nb[0] + Math.cos(a) * r, y = nb[1] + Math.sin(a) * r, s = 2.2 + rnd() * 2.6;
          const baixo = Math.max(0, (y - Hh * 0.35) / (Hh * 0.65)); c.globalAlpha = 1; c.fillStyle = cores[(rnd() * cores.length) | 0];
          for (let p = 0; p < 5; p++) { const pa = p * 1.2566 + a; c.beginPath(); c.arc(x + Math.cos(pa) * s * 0.55, y + Math.sin(pa) * s * 0.55, s * 0.5, 0, 7); c.fill(); }
          if (baixo > 0) { c.globalAlpha = baixo * 0.3; c.fillStyle = "#7a4060"; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); } }
        c.globalAlpha = 1; });
      const pts = []; sak.updateMatrixWorld(true); const v = new T.Vector3();
      sak.traverse((o) => { if (!o.isMesh || !/leaves/.test(o.material.name || "")) return; const P = M.lerF(o.geometry.attributes.position); const n = P.length / 3;
        for (let i = 0; i < 200; i++) { const k = (rnd() * n) | 0; pts.push(new T.Vector3(P[k * 3], P[k * 3 + 1], P[k * 3 + 2]).applyMatrix4(o.matrixWorld)); } });
      // cada nuvem de flores é um quadrado sempre virado para a câmera (instanciado: sem limite de tamanho de ponto)
      const mats = [], m4 = new T.Matrix4();
      for (const m of S) { const sc = m.getMaxScaleOnAxis(); for (const p of pts) { v.copy(p).applyMatrix4(m); const t = (1.1 + rnd() * 0.9) * sc / 0.3; mats.push(new T.Matrix4().makeScale(t, t, t).setPosition(v)); } }
      const U2 = (M.florU = T.UniformsUtils.merge([T.UniformsLib.fog, { map: { value: null }, uSun: { value: new T.Color("#ffc8a0") }, uSky: { value: new T.Color("#9a8ab8") } }])); U2.map.value = flor;
      const mt = new T.ShaderMaterial({ uniforms: U2, fog: true, alphaToCoverage: true,
        vertexShader: `varying vec2 vUv; varying vec3 vC;
          #include <fog_pars_vertex>
          void main(){ vec3 c = (instanceMatrix * vec4(0., 0., 0., 1.)).xyz; float s = length(instanceMatrix[0].xyz);
            vec4 mvPosition = viewMatrix * vec4(c, 1.); mvPosition.xy += position.xy * s; gl_Position = projectionMatrix * mvPosition; vUv = uv; vC = c;
          #include <fog_vertex>
          }`,
        fragmentShader: `uniform sampler2D map; uniform vec3 uSun, uSky; varying vec2 vUv; varying vec3 vC;
          #include <fog_pars_fragment>
          void main(){ vec4 c = texture2D(map, vUv); if (c.a < 0.5) discard; float h = fract(sin(dot(vC.xz, vec2(12.9898, 78.233))) * 43758.5453); vec3 col = c.rgb * mix(uSky * 0.62, uSun * 0.92, 0.35 + 0.5 * vUv.y) * (0.78 + 0.3 * h);
            gl_FragColor = vec4(col, 1.);
            #include <tonemapping_fragment>
            #include <encodings_fragment>
            #include <fog_fragment>
          }` });
      const quad = new T.PlaneGeometry(1, 1);
      M.instPedacos(new T.Mesh(quad, mt), mats, { cell: 30, longe: 170 });
    }
    // bordos vermelhos ao longo da trilha da floresta
    const B = []; for (let z = -156; z > -200; z -= 7) { const sd = rnd() < 0.5 ? -1 : 1; B.push(pos(M.trilhaX(z) + sd * (4.5 + rnd() * 2), z, 1.6 + rnd() * 0.6)); }
    M.instPedacos(mom, B, { sombra: true, longe: 150 });
    // árvores grandes no vale, perto da casa e do lago
    M.instPedacos(isl2, [pos(-44, -214, 2.6), pos(30, -268, 2.4), pos(-40, -262, 2.2)], { sombra: true });
    M.instPedacos(isl1, [pos(-26, -240, 1.7), pos(40, -212, 1.9)], { sombra: true });

    /* ---------- chão vivo: samambaias, capim, arbustos, pedras com musgo, tocos ---------- */
    // onde o chão está livre: nunca na cidade, na praça, nos degraus, no pátio de cascalho, na trilha, na água ou nos arrozais
    const livre = (x, z, dt) => {
      if (z > -70) return false;
      if (z <= L.Z_ESC0 + 5 && z >= L.Z_ESC1 - 3 && Math.abs(x) < 4.2) return false;
      if (Math.hypot(x - L.KOSATSU.x, z - L.KOSATSU.z) < 4.6) return false;
      if (z < L.Z_ESC1 + 2 && z > L.Z_PLAT1 - 1 && Math.abs(x) < 24) return false;
      if (z <= L.Z_PLAT1 + 3 && z > L.Z_VALE - 30 && Math.abs(x - M.trilhaX(z)) < dt) return false;
      const e = Math.pow((x - L.LAGO.x) / L.LAGO.rx, 2) + Math.pow((z - L.LAGO.z) / L.LAGO.rz, 2); if (e < 1.12) return false;
      if (z < L.Z_VALE + 2 && z > L.Z_VALE - 58 && Math.abs(x) < 58) return false;
      if (Math.hypot(x + 34, z + 226) < 12) return false;
      return true;
    };
    const [fern, grass, shrub2, shrub4, rock1, rock2, boulder, stump] = await Promise.all(["fern_02", "grass_medium_02", "shrub_02", "shrub_04", "rock_moss_set_01", "rock_moss_set_02", "boulder_01", "tree_stump_01"].map(load));
    duplaFace(fern); duplaFace(grass); duplaFace(shrub2); duplaFace(shrub4);
    const em = (n, gen) => { const out = []; const alvo = n; for (let i = 0, t = 0; i < alvo && t < n * 8; t++) { const r = gen(); if (r) { out.push(TRS(r[0], h(r[0], r[1]) - 0.05, r[1], rnd() * 6.28, r[2])); i++; } } return out; };
    // perto do caminho: na escadaria a distância é medida do eixo x=0, na floresta da trilha
    const perto = (spread, z0, z1, minD, dt, sc0, sc1) => () => { const z = z1 + rnd() * (z0 - z1); const x = (z < L.Z_ESC0 && z > L.Z_ESC1 ? 0 : M.trilhaX(z)) + (rnd() < 0.5 ? -1 : 1) * (minD + rnd() * spread); return livre(x, z, dt) ? [x, z, sc0 + rnd() * sc1] : null; };
    const det = { camada: 1, cell: 30, longe: 110 };
    M.instPedacos(fern, em(100, perto(7, L.Z_ESC0 - 2, L.Z_ESC1, 4.4, 1.3, 0.9, 0.8)).concat(em(120, perto(9, L.Z_PLAT1, L.Z_VALE - 10, 1.4, 1.3, 0.9, 0.9))), det);
    M.instPedacos(shrub2, em(30, perto(10, L.Z_ESC0 - 2, L.Z_VALE, 5, 2.6, 0.8, 0.6)), det);
    M.instPedacos(shrub4, em(30, perto(12, L.Z_ESC0 - 2, L.Z_VALE, 5, 2.6, 0.8, 0.6)), det);
    M.instPedacos(rock1, em(20, perto(10, L.Z_ESC0 - 4, L.Z_VALE, 7.5, 2.8, 0.6, 0.6)), det);
    M.instPedacos(rock2, em(18, perto(12, L.Z_PLAT1, L.Z_VALE - 5, 3.5, 2.8, 0.7, 0.7)), det);
    M.instPedacos(boulder, em(6, perto(14, L.Z_PLAT1 - 5, L.Z_VALE, 6, 3.5, 0.5, 0.5)), det);
    M.instPedacos(stump, em(8, perto(9, L.Z_PLAT1, L.Z_VALE, 3, 2.8, 0.8, 0.5)), det);
    // capim nas bordas dos arrozais e na beira do lago
    M.instPedacos(grass, em(140, () => { const x = (rnd() - 0.5) * 130, z = L.Z_VALE + 4 - rnd() * 70; if (Math.abs(x) < 56 && z < L.Z_VALE - 1 && z > L.Z_VALE - 56) { const lx = ((x - 6.5) % 13 + 13) % 13, lz = (((L.Z_VALE - 8 - z) + 6.25) % 12.5 + 12.5) % 12.5; if (Math.min(lx, 13 - lx) > 0.7 && Math.min(lz, 12.5 - lz) > 0.7) return null; } else if (!livre(x, z, 2)) return null; return [x, z, 0.8 + rnd() * 0.6]; })
      .concat(em(50, () => { const a = rnd() * 6.28, x = L.LAGO.x + Math.cos(a) * L.LAGO.rx * (1.12 + rnd() * 0.12), z = L.LAGO.z + Math.sin(a) * L.LAGO.rz * (1.12 + rnd() * 0.12); return Math.abs(x) < 4 && z > L.LAGO.z ? null : [x, z, 0.7 + rnd() * 0.5]; })), det);
  });
})();
