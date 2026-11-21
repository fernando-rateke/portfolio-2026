/* O passeio: a câmera anda por um caminho contínuo que liga a rua ao lago. Rolar, arrastar, as setas do teclado
   ou os botões levam de um lugar ao próximo; entre um lugar e outro a câmera desliza. */
(() => {
  const M = (window.MUNDO = window.MUNDO || {});
  M.builders = M.builders || [];
  M.builders.push(async (M) => {
    const { T, camera, sun, scene, h, L, V3 } = M;
    const tx = M.trilhaX, yEsc = M.yEsc;
    const chao = (x, z) => (z <= L.Z_ESC0 + 1 && z >= L.Z_ESC1 - 1 && Math.abs(x) < 2 ? yEsc(z) : h(x, z));
    const at = (x, z, a = 1.65) => V3(x, chao(x, z) + a, z);
    // cada nó: posição dos olhos, para onde olhar e, se for um lugar, o nome
    const N = [
      { p: V3(0.6, 1.65, 26), o: V3(-0.4, 3.2, -10), nome: "A rua", jp: "通り" },
      { p: V3(0.3, 1.65, -14), o: V3(0, 3.6, -60), nome: "As lojas", jp: "商店街" },
      { p: V3(0, 1.7, -53), o: V3(0, 7.5, -75), nome: "O grande torii", jp: "鳥居" },
      { p: at(0, -78, 1.6), o: V3(0, yEsc(-96) + 2, -96) },
      { p: at(0, -94, 1.6), o: V3(0, yEsc(-112) + 2.2, -112), nome: "Mil torii", jp: "千本鳥居" },
      { p: at(0, -111, 1.65), o: V3(0, L.Y_TOPO + 3, -140) },
      { p: at(0, -119, 1.65), o: V3(0, L.Y_TOPO + 3.5, -140), nome: "O santuário", jp: "神社" },
      { p: at(-2.2, -121.5, 1.65), o: V3(-11, L.Y_TOPO + 3.2, -128), nome: "A árvore sagrada", jp: "御神木" },
      { p: at(-10.5, -137, 1.65), o: V3(-9, L.Y_TOPO, -152) },
      { p: at(tx(-150), -150, 1.65), o: V3(tx(-165), h(tx(-165), -165) + 1.4, -165) },
      { p: at(tx(-172), -172, 1.65), o: V3(tx(-188), h(tx(-188), -188) + 1.2, -188), nome: "A floresta", jp: "森" },
      { p: at(tx(-196), -196, 3.2), o: V3(0, L.Y_VALE + 1, -290), nome: "O vale", jp: "谷" },
      { p: at(tx(-222) + 1.5, -222, 1.65), o: V3(-34, L.Y_VALE + 3.5, -226), nome: "O arrozal", jp: "田んぼ" },
      { p: at(tx(-245), -245, 1.65), o: V3(0, L.Y_VALE + 4, -300) },
      { p: M.pierFim.clone().add(V3(0, 1.9, 3)), o: V3(0, L.Y_AGUA + 3.2, -305), nome: "O lago", jp: "湖" },
    ];
    const posC = new T.CatmullRomCurve3(N.map((n) => n.p), false, "centripetal");
    const lookC = new T.CatmullRomCurve3(N.map((n) => n.o), false, "centripetal");
    const lugares = N.map((n, i) => (n.nome ? i : -1)).filter((i) => i >= 0);
    M.lugares = lugares.map((i) => ({ i, nome: N[i].nome, jp: N[i].jp }));
    const last = N.length - 1;
    let s = 0, alvo = 0;
    const q = M.Q.get("s"); if (q != null) { const v = parseFloat(q); s = alvo = q.includes(".") ? v : lugares[Math.min(lugares.length - 1, v | 0)] ?? 0; }
    M.irPara = (k) => { alvo = lugares[Math.max(0, Math.min(lugares.length - 1, k))]; };
    M.pular = (k) => { s = alvo = lugares[Math.max(0, Math.min(lugares.length - 1, k))]; };
    const atual = () => { let k = 0; for (let j = 0; j < lugares.length; j++) if (lugares[j] <= alvo + 0.01) k = j; return k; };
    M.proximo = () => M.irPara(atual() + 1); M.anterior = () => M.irPara(atual() - 1);

    /* interface mínima: nome do lugar e duas setas */
    const css = document.createElement("style");
    css.textContent = `.cam-ui{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);display:flex;align-items:center;gap:14px;font:500 15px/1.2 "Noto Serif JP","Hiragino Mincho ProN",Georgia,serif;color:#f6eee2;text-shadow:0 1px 8px rgba(0,0,0,.55);user-select:none;z-index:5}
      .cam-ui button{width:44px;height:44px;border-radius:50%;border:1px solid rgba(246,238,226,.45);background:rgba(20,14,18,.28);color:#f6eee2;font-size:18px;cursor:pointer;backdrop-filter:blur(4px)}
      .cam-ui button:disabled{opacity:.25;cursor:default}.cam-ui .nm{min-width:170px;text-align:center}.cam-ui .jp{display:block;font-size:12px;letter-spacing:.3em;opacity:.75;margin-top:3px}`;
    document.head.appendChild(css);
    const ui = document.createElement("div"); ui.className = "cam-ui"; ui.innerHTML = `<button aria-label="Voltar">‹</button><div class="nm"></div><button aria-label="Seguir">›</button>`;
    if (!M.Q.has("limpo")) document.body.appendChild(ui);
    const [bA, nm, bP] = [ui.children[0], ui.children[1], ui.children[2]];
    bA.onclick = () => M.anterior(); bP.onclick = () => M.proximo();
    addEventListener("keydown", (e) => { if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) { M.proximo(); e.preventDefault(); } if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) { M.anterior(); e.preventDefault(); } });
    let wheelAcc = 0, wheelT = 0;
    addEventListener("wheel", (e) => { const now = performance.now(); if (now - wheelT > 450) wheelAcc = 0; wheelT = now; wheelAcc += e.deltaY; if (Math.abs(wheelAcc) > 60) { (wheelAcc > 0 ? M.proximo : M.anterior)(); wheelAcc = 0; wheelT = now + 500; } }, { passive: true });
    let ty = null; addEventListener("touchstart", (e) => { ty = [e.touches[0].clientX, e.touches[0].clientY]; }, { passive: true });
    addEventListener("touchend", (e) => { if (!ty) return; const t = e.changedTouches[0], dx = t.clientX - ty[0], dy = t.clientY - ty[1]; if (Math.max(Math.abs(dx), Math.abs(dy)) > 40) ((Math.abs(dy) > Math.abs(dx) ? dy < 0 : dx < 0) ? M.proximo : M.anterior)(); ty = null; }, { passive: true });
    // olhar um pouco em volta com o mouse
    let mx = 0, my = 0; addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; } });

    /* luzes: em vez de dezenas de luzes ligadas ao mesmo tempo, um punhado delas segue a câmera e ocupa o lugar
       das fontes mais próximas (lanternas, máquinas, postes). O número de luzes nunca muda, então nada recompila. */
    const fontes = { p: [], s: [] };
    scene.updateMatrixWorld(true);
    scene.traverse((o) => { if (o === sun || !(o.isPointLight || o.isSpotLight)) return; const w = new T.Vector3(); o.getWorldPosition(w);
      const f = { w, c: o.color.clone(), i: o.intensity, d: o.distance, dec: o.decay, src: o };
      if (o.isSpotLight) { f.tg = new T.Vector3(); o.target.getWorldPosition(f.tg); f.ang = o.angle; f.pen = o.penumbra; fontes.s.push(f); } else fontes.p.push(f); });
    for (const f of [...fontes.p, ...fontes.s]) { f.src.parent && f.src.parent.remove(f.src); if (f.src.target && f.src.target.parent) f.src.target.parent.remove(f.src.target); }
    M.luzFonte = (w, c, i, d) => fontes.p.push({ w, c: new T.Color(c), i, d, dec: 2 });
    const poolP = Array.from({ length: 6 }, () => { const l = new T.PointLight("#fff", 0, 5, 2); scene.add(l); return l; });
    const poolS = Array.from({ length: 3 }, () => { const l = new T.SpotLight("#fff", 0, 14, 0.9, 0.6, 1.5); scene.add(l, l.target); return l; });
    const fv = new T.Vector3();
    function luzes(pos) {
      camera.getWorldDirection(fv);
      const nota = (f) => { const d = f.w.distanceTo(pos); const frente = f.w.clone().sub(pos).dot(fv) > -4 ? 0 : 25; return d + frente; };
      const ps = fontes.p.map((f) => [nota(f), f]).sort((a, b) => a[0] - b[0]);
      poolP.forEach((l, k) => { const e = ps[k]; if (!e || e[0] > 70) { l.intensity = 0; return; } const f = e[1]; l.position.copy(f.w); l.color.copy(f.c); l.distance = f.d; l.decay = f.dec; l.intensity = (f.live ? f.live() : f.i) * Math.min(1, (70 - e[0]) / 20); });
      const ss = fontes.s.map((f) => [nota(f), f]).sort((a, b) => a[0] - b[0]);
      poolS.forEach((l, k) => { const e = ss[k]; if (!e || e[0] > 60) { l.intensity = 0; return; } const f = e[1]; l.position.copy(f.w); l.target.position.copy(f.tg); l.color.copy(f.c); l.distance = f.d; l.angle = f.ang; l.penumbra = f.pen; l.intensity = f.i * Math.min(1, (60 - e[0]) / 15); });
    }
    M.fontesLuz = fontes;

    let lastNome = "";
    const look = new T.Vector3(), pos = new T.Vector3(), tmp = new T.Vector3();
    scene.add(sun.target);
    const sunOff = sun.position.clone();
    let prevT = 0;
    M.camTick = (t) => {
      const dt = Math.min(0.05, t - prevT); prevT = t;
      // desliza até o alvo; a velocidade cresce com a distância e é suave nas pontas
      const d = alvo - s; s += Math.sign(d) * Math.min(Math.abs(d), (0.25 + Math.abs(d) * 0.9) * dt * 1.4);
      const u = Math.max(0, Math.min(1, s / last));
      posC.getPoint(u, pos); lookC.getPoint(u, look);
      const g = chao(pos.x, pos.z) + 1.3; if (pos.y < g) pos.y = g;
      pos.x += Math.sin(t * 0.13) * 0.05; pos.y += Math.sin(t * 0.21) * 0.025;
      camera.position.copy(pos);
      tmp.copy(look).sub(pos); const yaw = -mx * 0.35, pitch = -my * 0.18;
      tmp.applyAxisAngle(V3(0, 1, 0), yaw); tmp.y += pitch * tmp.length();
      camera.lookAt(tmp.add(pos));
      sun.target.position.copy(pos); sun.position.copy(pos).add(sunOff);
      luzes(pos);
      const k = atual(); const n = N[lugares[k]];
      if (n.nome !== lastNome) { nm.innerHTML = `${n.nome}<span class="jp">${n.jp}</span>`; lastNome = n.nome; }
      bA.disabled = k === 0 && Math.abs(d) < 0.01; bP.disabled = k === lugares.length - 1;
    };
  });
})();
