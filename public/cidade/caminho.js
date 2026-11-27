/* O passeio. A câmera fica num lugar de cada vez e o visitante olha em volta (arrastando a tela, ou com as setas).
   Para ir a outro lugar, abre-se o mapa: a câmera sobe num voo contínuo até o céu, a cidade vira uma maquete viva lá
   embaixo, cada lugar tem um carimbo vermelho (hanko) flutuando em cima, e tocar num carimbo faz a câmera mergulhar
   até ele, como um pássaro pousando. Cada lugar visitado ganha o seu selo no caderno (goshuinchō), guardado no navegador. */

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
      { p: V3(0.6, 1.65, 26), o: V3(-0.4, 3.2, -10), id: "rua", g: "A cidade", nome: "A rua", jp: "通り" },
      { p: V3(0.3, 1.65, -14), o: V3(0, 3.6, -60), id: "lojas", g: "A cidade", nome: "A cafeteria", jp: "喫茶店" },
      { p: V3(0, 1.7, -53), o: V3(0, 7.5, -75), id: "torii", g: "O santuário", nome: "O grande torii", jp: "鳥居" },
      { p: at(0, -78, 1.6), o: V3(0, yEsc(-96) + 2, -96) },
      { p: at(0.2, -94.5, 1.6), o: V3(4.6, yEsc(-104) + 2.0, -104), id: "escadaria", g: "O santuário", nome: "A escadaria das cerejeiras", jp: "桜の石段" },
      // o fim do Ato 1: o torii do topo da escadaria, a porta para o Pavilhão (docs/plano-tres-atos.md)
      { p: at(0, -108.6, 1.6), o: V3(0, L.Y_TOPO + 2.7, -122), id: "porta", g: "O santuário", nome: "A porta", jp: "門" },
    ];

    /* ---------- os lugares e os carimbos ---------- */
    const lugares = N.map((n, i) => (n.nome ? i : -1)).filter((i) => i >= 0);
    // o kanji do carimbo de cada lugar e onde ele flutua no mapa visto do céu
    const HANKO = { rua: ["通", V3(0, 8, 14)], lojas: ["喫", V3(0, 10, -26)], torii: ["鳥居", V3(0, 13, -64)], escadaria: ["桜", V3(0, yEsc(-94) + 8, -94)], porta: ["門", V3(0, L.Y_TOPO + 9, -114.5)],
      vale: ["谷", V3(tx(-198), h(tx(-198), -198) + 10, -198)], arrozal: ["田", V3(-34, L.Y_VALE + 7, -226)], lago: ["湖", V3(0, L.Y_AGUA + 9, -300)] };
    M.lugares = lugares.map((i, k) => ({ i: k, id: N[i].id, g: N[i].g, nome: N[i].nome, jp: N[i].jp, kj: (HANKO[N[i].id] || ["印"])[0] }));
    let aqui = 0;
    { const q = M.Q.get("s"); if (q != null) aqui = Math.max(0, Math.min(lugares.length - 1, parseInt(q, 10) || 0)); }
    const noLugar = (k) => N[lugares[k]];
    // o selo de cada lugar visitado fica guardado neste navegador
    let selos = []; try { selos = JSON.parse(localStorage.getItem("cidade-selos") || "[]"); } catch (e) { selos = []; }
    const carimbar = (id) => { if (selos.includes(id)) return false; selos.push(id); try { localStorage.setItem("cidade-selos", JSON.stringify(selos)); } catch (e) { /* sem storage */ } return true; };

    /* ---------- a câmera: no lugar, voando, ou lá em cima no céu ---------- */
    /* o céu: uma vista de drone, inclinada, que corre ao longo da cidade (arrastar ou rolar anda pelo mapa, da rua ao
       lago); começa em cima do lugar onde se está */
    const OFF = V3(-52, 68, 82), CEU = { p: V3(), o: V3() }; let zF = 0, zFA = 0;
    const Z0 = 0, Z1 = -290;
    const ajustaCeu = () => { const a = innerWidth / innerHeight; OFF.set(a < 0.8 ? -8 : -52, a < 0.8 ? 92 : 68, a < 0.8 ? 64 : 82); };
    const poseCeu = (z, out = CEU) => { out.o.set(0, Math.max(0, h(0, z)) + 4, z); out.p.copy(out.o).add(OFF); return out; };
    addEventListener("resize", ajustaCeu); ajustaCeu(); M.CEU = CEU;
    const andarCeu = (dz) => { zF = Math.max(Z1, Math.min(Z0, zF + dz)); }; M.andarCeu = andarCeu;
    addEventListener("wheel", (e) => { if (modo === "ceu" && !M.dentro) andarCeu(-e.deltaY * 0.12); }, { passive: true });
    let modo = "lugar", voo = null, yaw = 0, pitch = 0, yawA = 0, pitchA = 0, mx = 0, my = 0, fogK = 1;
    const olho = new T.Vector3(), mira = new T.Vector3(), tmp = new T.Vector3(), dir = new T.Vector3(), up = V3(0, 1, 0);
    { const n = noLugar(aqui); olho.copy(n.p); mira.copy(n.o); }
    M.olhar = (dx, dy) => { yaw = Math.max(-2.6, Math.min(2.6, yaw - dx * 1.4)); pitch = Math.max(-0.55, Math.min(0.5, pitch - dy)); };
    addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; } });
    // arrastar a tela olha em volta (o clique continua funcionando: só conta como arrasto depois de alguns pixels)
    { const cv = M.renderer.domElement; let arr = null;
      cv.addEventListener("pointerdown", (e) => { if (!M.dentro) arr = [e.clientX, e.clientY]; });
      addEventListener("pointermove", (e) => { if (!arr || M.dentro) return; const dx = e.clientX - arr[0], dy = e.clientY - arr[1]; arr = [e.clientX, e.clientY];
        if (modo === "lugar") M.olhar(dx / innerWidth * 1.6, dy / innerHeight * 1.1); else if (modo === "ceu") andarCeu(dy * 0.35); });
      addEventListener("pointerup", () => { arr = null; }); addEventListener("pointercancel", () => { arr = null; }); }
    const bez = (a, b, c, d, u, out) => { const v = 1 - u; return out.set(0, 0, 0).addScaledVector(a, v * v * v).addScaledVector(b, 3 * v * v * u).addScaledVector(c, 3 * v * u * u).addScaledVector(d, u * u * u); };
    const suave = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    // de onde a câmera chega a um lugar: de cima e de trás dele (do lado contrário para onde se olha)
    const chegada = (n, alto = 34) => { const tr = n.p.clone().sub(n.o).setY(0).normalize().multiplyScalar(26); return n.p.clone().add(tr).add(V3(0, alto, 0)); };
    function voar(paraP, paraO, b, c, dur, fim) { voo = { a: camera.position.clone(), b, c, d: paraP.clone(), oa: mira0().clone(), ob: paraO.clone(), t0: null, dur, fim, ceu: true }; }
    const mira0 = () => tmp.copy(camera.position).add(camera.getWorldDirection(dir).multiplyScalar(30));
    function subir() { if (modo === "ceu" || voo || M.dentro) return; fecharTudo();
      zF = zFA = Math.max(Z1, Math.min(Z0, noLugar(aqui).p.z - 45)); poseCeu(zF);
      const a = camera.position.clone(); voar(CEU.p, CEU.o, a.clone().add(V3(0, 30, 0)), CEU.p.clone().add(V3(10, -30, 20)), 2.4, () => { modo = "ceu"; ui(); });
      modo = "subindo"; ui(); }
    function pousar(k) { k = Math.max(0, Math.min(lugares.length - 1, k)); if (M.dentro) return; fecharTudo(); const n = noLugar(k);
      const de = camera.position.clone(), alto = modo === "ceu" ? 0 : 38;
      const b = modo === "ceu" ? de.clone().lerp(n.p, 0.35).setY(de.y * 0.9) : de.clone().add(V3(0, alto, 0));
      const dist = de.distanceTo(n.p), dur = modo === "ceu" ? 2.6 : Math.min(4.2, 1.6 + dist / 70);
      if (k === aqui && modo === "lugar") return;
      voar(n.p, n.o, b, chegada(n), dur, () => { modo = "lugar"; aqui = k; yaw = pitch = yawA = pitchA = 0; chegou(k); });
      modo = "descendo"; aqui = k; ui(); }
    const fecharTudo = () => { if (M.painelAberto && M.painelAberto()) M.fechar(); };
    M.irPara = pousar; M.pular = (k) => { voo = null; modo = "lugar"; aqui = Math.max(0, Math.min(lugares.length - 1, k)); yaw = pitch = yawA = pitchA = 0; chegou(aqui, true); };
    M.mapa = () => (modo === "ceu" || modo === "subindo" ? pousar(aqui) : subir());
    M.noCeu = () => modo !== "lugar";
    M.lugarAtual = () => aqui;
    M.proximo = () => { if (aqui === lugares.length - 1 && M.creditos) M.creditos(); else pousar(aqui + 1); };
    M.anterior = () => pousar(aqui - 1);

    /* ---------- a interface: o nome do lugar, o botão do mapa e, no céu, os carimbos ---------- */
    const css = document.createElement("style");
    css.textContent = `
      .nav-lugar{position:fixed;left:22px;bottom:22px;z-index:5;display:flex;align-items:center;gap:12px;color:#f6eee2;font:600 17px/1.2 "Shippori Mincho","Noto Serif JP",Georgia,serif;text-shadow:0 1px 10px rgba(0,0,0,.6);pointer-events:none;transition:opacity .5s}
      .nav-lugar small{display:block;font-size:12px;letter-spacing:.32em;opacity:.75;margin-top:4px;font-weight:400}
      .nav-lugar .selo{width:42px;height:42px;display:grid;place-items:center;border-radius:5px;background:#b5301b;color:#fff3e4;font-size:16px;line-height:1.05;writing-mode:vertical-rl;transform:rotate(-5deg);box-shadow:inset 0 0 0 2px rgba(255,236,214,.35),0 3px 10px rgba(0,0,0,.35)}
      .nav-lugar.novo .selo{animation:carimbo .9s cubic-bezier(.2,1.4,.4,1)}
      @keyframes carimbo{0%{transform:scale(2.6) rotate(-18deg);opacity:0}55%{transform:scale(.92) rotate(-4deg);opacity:1}100%{transform:scale(1) rotate(-5deg)}}
      .nav-lugar .novo-txt{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#ffd7a8;opacity:0;transition:opacity .4s}.nav-lugar.novo .novo-txt{opacity:1}
      .nav-mapa{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:6;display:flex;align-items:center;gap:10px;padding:10px 20px 10px 14px;border-radius:999px;border:1px solid rgba(246,238,226,.5);
        background:rgba(20,14,18,.42);color:#f6eee2;font:600 15px "Shippori Mincho","Noto Serif JP",Georgia,serif;cursor:pointer;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);transition:background .25s,transform .25s}
      .nav-mapa:hover,.nav-mapa:focus-visible{background:rgba(181,48,27,.8);outline:none}
      .nav-mapa svg{width:26px;height:26px}.nav-mapa kbd{font:11px monospace;opacity:.6;border:1px solid rgba(246,238,226,.35);border-radius:4px;padding:1px 5px}
      body.no-ceu .nav-lugar{opacity:0}body.voando .marcas,body.no-ceu .marcas{opacity:0;transition:opacity .4s}
      .ceu-ui{position:fixed;inset:0;z-index:5;pointer-events:none;opacity:0;transition:opacity .6s}body.no-ceu .ceu-ui{opacity:1}
      .ceu-tit{position:absolute;left:14px;top:max(12px,2vh);padding:12px 18px 14px;border-radius:10px;background:linear-gradient(135deg,rgba(14,8,12,.62),rgba(14,8,12,.25));backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:2;text-align:left;color:#f6eee2;font:800 24px/1.2 "Shippori Mincho",Georgia,serif;text-shadow:0 2px 14px rgba(0,0,0,.7)}
      .ceu-tit small{display:block;margin-top:6px;font:400 13px "Shippori Mincho",Georgia,serif;letter-spacing:.16em;opacity:.85}
      .hanko{position:absolute;left:0;top:0;pointer-events:auto;border:0;background:none;padding:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;transform:translate(-50%,-100%);color:#f6eee2}
      .hanko i{display:grid;place-items:center;min-width:44px;height:44px;padding:0 5px;box-sizing:border-box;border-radius:6px;font:800 19px/1 "Shippori Mincho",serif;font-style:normal;color:#b5301b;background:rgba(250,240,222,.92);
        box-shadow:inset 0 0 0 2.5px #b5301b,0 6px 16px rgba(0,0,0,.45);transform:rotate(var(--r,-4deg));transition:transform .25s,background .25s,color .25s;animation:flutua 3.2s ease-in-out infinite;animation-delay:var(--d,0s)}
      .hanko.ok i{background:#b5301b;color:#fff3e4;box-shadow:inset 0 0 0 2.5px rgba(255,236,214,.4),0 6px 16px rgba(0,0,0,.45)}
      .hanko span{font:600 13.5px "Shippori Mincho",Georgia,serif;white-space:nowrap;padding:3px 10px;border-radius:999px;background:rgba(20,14,18,.62);opacity:.0;transform:translateY(-4px);transition:opacity .25s,transform .25s}
      .hanko:hover i,.hanko:focus-visible i,.hanko.on i{transform:rotate(0deg) scale(1.22)}.hanko:hover span,.hanko:focus-visible span,.hanko.on span{opacity:1;transform:none}.hanko:focus-visible{outline:none}
      .hanko.fim i{background:#1e120c;color:#f2e8d2;box-shadow:inset 0 0 0 2.5px #c8a868,0 6px 16px rgba(0,0,0,.45)}
      @keyframes flutua{50%{translate:0 -5px}}
      @media (prefers-reduced-motion:reduce){.hanko i{animation:none}}
      @media (max-width:600px){.ceu-tit{top:66px;left:10px;right:10px;font-size:19px;padding:10px 14px}.ceu-tit .como{display:none}.nav-lugar{left:14px;bottom:84px;font-size:15px}.nav-mapa{bottom:16px}.hanko i{min-width:38px;height:38px;font-size:16px}.hanko span{opacity:1;font-size:12px}}`;
    document.head.appendChild(css);
    const limpo = M.Q.has("limpo");
    const navL = document.createElement("div"); navL.className = "nav-lugar"; navL.innerHTML = `<div class="selo"></div><div><b class="nm"></b><small class="jp"></small><span class="novo-txt">novo selo no caderno</span></div>`;
    const btn = document.createElement("button"); btn.className = "nav-mapa"; btn.type = "button";
    const AVE = `<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M3 15c4-1 7 0 9 2 1-4 4-8 9-9l-2 4c3 0 6 1 9 4-4 0-7 1-9 3-2 3-5 5-9 5 1-2 1-4 0-5-2 0-5-1-7-4z"/></svg>`;
    const ceuUI = document.createElement("div"); ceuUI.className = "ceu-ui"; ceuUI.innerHTML = `<div class="ceu-tit">Para onde?<small></small><small class="como">arraste ou role para andar pelo mapa · toque num carimbo para ir</small></div>`;
    if (!limpo) document.body.append(navL, btn, ceuUI);
    const hk = M.lugares.map((l, k) => { const b = document.createElement("button"); b.type = "button"; b.className = "hanko"; b.style.setProperty("--r", `${((k * 37) % 9) - 5}deg`); b.style.setProperty("--d", `${(k * 0.37) % 3}s`);
      b.innerHTML = `<i>${l.kj}</i><span>${l.nome}</span>`; b.addEventListener("click", (e) => { e.stopPropagation(); if (modo === "ceu") pousar(k); });
      b.addEventListener("pointerenter", () => { hover = k; }); b.addEventListener("pointerleave", () => { if (hover === k) hover = -1; }); b.addEventListener("focus", () => { hover = k; });
      ceuUI.appendChild(b); return { b, p: (HANKO[l.id] || [0, noLugar(k).o])[1] }; });
    // o carimbo do fim: os créditos, depois do lago
    const fimB = document.createElement("button"); fimB.type = "button"; fimB.className = "hanko fim"; fimB.innerHTML = `<i>終</i><span>O fim · créditos</span>`; ceuUI.appendChild(fimB);
    fimB.addEventListener("click", (e) => { e.stopPropagation(); if (modo === "ceu" && M.creditos) { pousar(lugares.length - 1); setTimeout(() => M.creditos(), 2700); } });
    const fimP = V3(0, L.Y_AGUA + 14, -338);
    let hover = -1;
    function ui() {
      const n = noLugar(aqui), kj = (HANKO[n.id] || ["印"])[0];
      navL.querySelector(".nm").textContent = n.nome; navL.querySelector(".jp").textContent = n.jp; navL.querySelector(".selo").textContent = kj;
      const cima = modo === "ceu" || modo === "subindo";
      btn.innerHTML = cima ? `${AVE}<span>Voltar para ${n.nome.replace(/^(A|O|As|Os) /, (m) => m.toLowerCase())}</span><kbd>M</kbd>` : `${AVE}<span>Mapa</span><kbd>M</kbd>`;
      btn.setAttribute("aria-label", cima ? "Voltar para o lugar" : "Abrir o mapa visto do céu");
      document.body.classList.toggle("no-ceu", modo === "ceu"); document.body.classList.toggle("voando", modo !== "lugar");
      for (const [k, h] of hk.entries()) h.b.classList.toggle("ok", selos.includes(M.lugares[k].id));
      ceuUI.querySelector("small:not(.como)").textContent = `御朱印 · ${M.lugares.filter((l) => selos.includes(l.id)).length} de ${M.lugares.length} selos no caderno`;
    }
    function chegou(k, quieto) { const novo = carimbar(noLugar(k).id); ui(); if (novo && !quieto) { navL.classList.remove("novo"); void navL.offsetWidth; navL.classList.add("novo"); setTimeout(() => navL.classList.remove("novo"), 2600); } }
    btn.addEventListener("click", (e) => { e.stopPropagation(); M.mapa(); });
    addEventListener("keydown", (e) => { if (M.dentro || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) || (M.painelAberto && M.painelAberto())) return;
      const k = e.key.toLowerCase();
      if (k === "m") { M.mapa(); e.preventDefault(); }
      else if (k === "escape" && modo === "ceu") { pousar(aqui); e.preventDefault(); }
      else if (modo === "ceu" && (k === "arrowup" || k === "w" || k === "arrowright")) { andarCeu(-30); e.preventDefault(); }
      else if (modo === "ceu" && (k === "arrowdown" || k === "s" || k === "arrowleft")) { andarCeu(30); e.preventDefault(); }
      else if (modo === "lugar" && (k === "arrowleft" || k === "a")) { M.olhar(-0.12, 0); e.preventDefault(); }
      else if (modo === "lugar" && (k === "arrowright" || k === "d")) { M.olhar(0.12, 0); e.preventDefault(); }
      else if (modo === "lugar" && (k === "arrowup" || k === "w")) { M.olhar(0, -0.08); e.preventDefault(); }
      else if (modo === "lugar" && (k === "arrowdown" || k === "s")) { M.olhar(0, 0.08); e.preventDefault(); } });
    // pinça para fora (dois dedos se aproximando) abre o mapa
    { let d0 = 0; addEventListener("touchstart", (e) => { if (e.touches.length === 2) d0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }, { passive: true });
      addEventListener("touchmove", (e) => { if (e.touches.length !== 2 || !d0 || M.dentro) return; const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (d < d0 * 0.7) { d0 = 0; if (modo === "lugar") subir(); } }, { passive: true }); }

    // uma coluna de luz em cima do lugar apontado no mapa
    const pilar = new T.Mesh(new T.CylinderGeometry(2.2, 2.2, 120, 24, 1, true), new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false,
      uniforms: { uT: M.anim ? M.anim.U.uT : { value: 0 } }, vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform float uT; varying vec2 vU; void main(){ float a = pow(1. - vU.y, 2.2) * (0.55 + 0.15 * sin(uT * 3.)); gl_FragColor = vec4(vec3(1., .78, .5) * a, a); }` }));
    pilar.visible = false; pilar.frustumCulled = false; scene.add(pilar);
    const pv = new T.Vector3();
    function carimbos() {
      const ver = modo === "ceu" || (voo && modo === "subindo" && camera.position.y > 90);
      for (const [k, h] of hk.entries()) { pv.copy(h.p).project(camera); const fora = pv.z > 1 || Math.abs(pv.x) > 1.1 || Math.abs(pv.y) > 1.1;
        h.b.style.transform = `translate(${((pv.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px, ${((-pv.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px) translate(-50%, -100%)`; h.b.style.visibility = ver && !fora ? "visible" : "hidden"; h.b.classList.toggle("on", hover === k); }
      pv.copy(fimP).project(camera); fimB.style.transform = `translate(${((pv.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px, ${((-pv.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px) translate(-50%, -100%)`; fimB.style.visibility = ver && M.creditos ? "visible" : "hidden";
      pilar.visible = modo === "ceu" && hover >= 0; if (pilar.visible) { const p = hk[hover].p; pilar.position.set(p.x, p.y - 10 + 60, p.z); }
    }

    /* luzes: em vez de dezenas de luzes ligadas ao mesmo tempo, um punhado delas segue a câmera e ocupa o lugar
       das fontes mais próximas (lanternas, máquinas, postes). O número de luzes nunca muda, então nada recompila. */
    const fontes = { p: [], s: [] };
    scene.updateMatrixWorld(true);
    scene.traverse((o) => { if (o === sun || !(o.isPointLight || o.isSpotLight)) return; const w = new T.Vector3(); o.getWorldPosition(w);
      const f = { w, c: o.color.clone(), i: o.intensity, d: o.distance, dec: o.decay, src: o };
      if (o.isSpotLight) { f.tg = new T.Vector3(); o.target.getWorldPosition(f.tg); f.ang = o.angle; f.pen = o.penumbra; fontes.s.push(f); } else fontes.p.push(f); });
    for (const f of [...fontes.p, ...fontes.s]) { f.src.parent && f.src.parent.remove(f.src); if (f.src.target && f.src.target.parent) f.src.target.parent.remove(f.src.target); }
    M.luzFonte = (w, c, i, d) => fontes.p.push({ w, c: new T.Color(c), i, d, dec: 2 });
    const poolP = Array.from({ length: 3 }, () => { const l = new T.PointLight("#fff", 0, 5, 2); scene.add(l); return l; });
    const poolS = Array.from({ length: 1 }, () => { const l = new T.SpotLight("#fff", 0, 14, 0.9, 0.6, 1.5); scene.add(l, l.target); return l; });
    const fv = new T.Vector3();
    function luzes(pos) {
      camera.getWorldDirection(fv);
      const nota = (f) => { const d = f.w.distanceTo(pos); const frente = f.w.clone().sub(pos).dot(fv) > -4 ? 0 : 25; return d + frente; };
      const ps = fontes.p.map((f) => [nota(f), f]).sort((a, b) => a[0] - b[0]);
      poolP.forEach((l, k) => { const e = ps[k]; if (!e || e[0] > 70) { l.intensity = 0; return; } const f = e[1]; l.position.copy(f.w); l.color.copy(f.c); l.distance = f.d; l.decay = f.dec; l.intensity = (f.live ? f.live() : f.i) * (M.luzK || 1) * Math.min(1, (70 - e[0]) / 20); });
      const ss = fontes.s.map((f) => [nota(f), f]).sort((a, b) => a[0] - b[0]);
      poolS.forEach((l, k) => { const e = ss[k]; if (!e || e[0] > 60) { l.intensity = 0; return; } const f = e[1]; l.position.copy(f.w); l.target.position.copy(f.tg); l.color.copy(f.c); l.distance = f.d; l.angle = f.ang; l.penumbra = f.pen; l.intensity = f.i * (M.luzK || 1) * Math.min(1, (60 - e[0]) / 15); });
    }

    scene.add(sun.target);
    const sunOff = (M.sunOff = sun.position.clone().setLength(45)); // perto: a sombra só precisa cobrir os arredores da câmera; à noite, a lua
    /* a sombra do sol cobre um quadrado em volta da câmera. Em vez de refazer o mapa de sombra a cada quadro, o centro
       anda em degraus de 5 m (e quando o tema muda a direção do sol): parado ou olhando em volta, a sombra não custa nada */
    const sc0 = new T.Vector3(1e9, 0, 0), sDir = new T.Vector3();
    function sombra(p) { const x = Math.round(p.x / 5) * 5, z = Math.round(p.z / 5) * 5, y = Math.round(p.y / 5) * 5;
      if (x === sc0.x && y === sc0.y && z === sc0.z && sDir.equals(sunOff)) return; sc0.set(x, y, z); sDir.copy(sunOff);
      sun.target.position.copy(sc0); sun.position.copy(sc0).add(sunOff); sun.target.updateMatrixWorld(); M.renderer.shadowMap.needsUpdate = true; }
    M.refazSombra = () => { sc0.x = 1e9; };

    let prevT = 0;
    M.camTick = (t) => {
      const dt = Math.min(0.05, t - prevT); prevT = t;
      // uma câmera de fora (os créditos do fim, ou um teste com M.camFix = [olho, alvo]) toma o lugar do passeio
      if (M.cinema || M.camFix) { if (M.cinema) M.cinema(t, dt, camera); else { camera.position.set(...M.camFix[0]); camera.lookAt(...M.camFix[1]); }
        M.semCorte = false; sombra(camera.position); luzes(camera.position); return; }
      if (voo) {
        if (voo.t0 == null) voo.t0 = t;
        const u = Math.min(1, (t - voo.t0) / voo.dur), e = suave(u);
        bez(voo.a, voo.b, voo.c, voo.d, e, olho); mira.copy(voo.oa).lerp(voo.ob, suave(Math.min(1, u * 1.25)));
        camera.position.copy(olho); camera.lookAt(mira);
        if (u >= 1) { const f = voo.fim; voo = null; f(); }
      } else if (modo === "ceu") {
        zFA += (zF - zFA) * Math.min(1, dt * 3.5); poseCeu(zFA);
        olho.copy(CEU.p).add(V3(Math.sin(t * 0.07) * 3, Math.sin(t * 0.11) * 1.5, Math.cos(t * 0.05) * 2)); mira.copy(CEU.o);
        camera.position.copy(olho); tmp.copy(mira).sub(olho).applyAxisAngle(up, -mx * 0.12); tmp.y -= my * 0.08 * tmp.length(); camera.lookAt(tmp.add(olho));
      } else {
        // no lugar: a posição dele, um balanço quase imperceptível, e o olhar em volta (arrasto + mouse)
        const n = noLugar(aqui); olho.copy(n.p); olho.x += Math.sin(t * 0.13) * 0.05; olho.y += Math.sin(t * 0.21) * 0.025;
        const g = chao(olho.x, olho.z) + 1.3; if (olho.y < g) olho.y = g;
        yawA += (yaw - yawA) * Math.min(1, dt * 6); pitchA += (pitch - pitchA) * Math.min(1, dt * 6);
        camera.position.copy(olho); tmp.copy(n.o).sub(olho); const L0 = tmp.length();
        tmp.applyAxisAngle(up, yawA - mx * 0.35); tmp.y += (pitchA - my * 0.18) * L0; camera.lookAt(tmp.add(olho)); mira.copy(tmp);
      }
      // lá de cima a cidade inteira aparece: nada é cortado pela distância e a névoa quase some
      const alto = camera.position.y; M.semCorte = modo !== "lugar" && alto > 40;
      const fCeu = M.fogKCeu != null ? M.fogKCeu : 0.45, k = modo === "lugar" ? 1 : Math.max(fCeu, Math.min(1, 1 - (alto - 25) / 70)); fogK += (k - fogK) * Math.min(1, dt * 4);
      if (M.fogDens && scene.fog) scene.fog.density = M.fogDens * fogK;
      sombra(camera.position); luzes(camera.position); carimbos();
    };
    ui(); chegou(aqui, true);
  });
})();
