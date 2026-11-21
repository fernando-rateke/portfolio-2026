/* O portfólio dentro da cidade. Cada loja da rua é uma matéria (a placa em japonês, o nome em português ao passar o
   mouse); a cafeteria é o "Quem sou". Clicar ou tocar na placa, na cortina ou na fachada abre um painel de papel com
   as atividades daquela matéria, lidas de /biblioteca/atividades.json (o mesmo arquivo do portfólio antigo). */
(() => {
  const M = (window.MUNDO = window.MUNDO || {});
  M.builders = M.builders || [];
  const PERFIL = { id: "perfil", name: "Quem sou", desc: "Fernando Rateke Neto", acts: [
    { t: "Quem sou", s: "Fernando Rateke Neto", r: "Desenvolvedor de sistemas em formação, em Florianópolis (SC). Ensino Médio integrado ao Técnico em Análise e Desenvolvimento de Sistemas no SESI SENAI, turma 3B, 2026.\n\nDesde cedo tive afinidade com as exatas, principalmente matemática, biologia e programação. Gosto de desafios de lógica, de interfaces que se explicam sozinhas e de soluções que funcionam bem. Além do código, levo comigo a pesquisa científica pela Iniciação Científica.", img: "perfil/retrato.jpg" },
    { t: "Interesses", s: "o que eu gosto", r: "Studio Ghibli (O Castelo Animado, A Viagem de Chihiro, Meu Amigo Totoro), animes (Frieren, Attack on Titan, Tokyo Ghoul), cultura japonesa e caligrafia, jogar e criar mundos." },
  ] };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const imgUrl = (u) => (!u ? "" : /^https?:|^\//.test(u) ? u : "/vale/" + u);
  const safeHref = (u) => (/^(https?:\/\/|\/)/.test(u || "") ? u : "#");

  M.builders.push(async (M) => {
    const { T, camera, scene } = M;
    let subjects = [];
    try { subjects = await fetch("/biblioteca/atividades.json").then((r) => (r.ok ? r.json() : [])); } catch (e) { subjects = []; }
    const byId = Object.fromEntries(subjects.map((s) => [s.id, s])); byId.perfil = PERFIL;

    /* ---------- o painel ---------- */
    const css = document.createElement("style");
    css.textContent = `
      .pp{position:fixed;top:0;right:0;height:100%;width:min(440px,100vw);z-index:20;transform:translateX(105%);transition:transform .55s cubic-bezier(.2,.8,.2,1);
        background:#f3ece0 radial-gradient(circle at 20% 10%,rgba(255,255,255,.55),transparent 60%);color:#2a2220;font:15px/1.55 "Noto Serif JP","Hiragino Mincho ProN",Georgia,serif;
        box-shadow:-18px 0 50px rgba(20,10,10,.35);display:flex;flex-direction:column}
      .pp.on{transform:none}
      .pp header{padding:26px 26px 16px;border-bottom:1px solid rgba(60,40,30,.15);display:flex;gap:16px;align-items:flex-start}
      .pp .kj{font-size:40px;line-height:1;writing-mode:vertical-rl;padding:8px 6px;border-radius:3px;color:#fff;min-height:64px;text-align:center}
      .pp h2{margin:0 0 4px;font-size:22px;font-weight:600}.pp .ds{margin:0;font-size:13.5px;opacity:.75}
      .pp .x{margin-left:auto;background:none;border:0;font-size:26px;line-height:1;cursor:pointer;color:#5a4a40;padding:4px 8px}
      .pp .bd{overflow:auto;padding:18px 26px 40px;flex:1;-webkit-overflow-scrolling:touch}
      .pp .card{display:flex;gap:14px;align-items:center;padding:12px;margin:0 0 10px;border-radius:6px;background:rgba(255,255,255,.55);border:1px solid rgba(60,40,30,.1);cursor:pointer;text-align:left;width:100%;font:inherit;color:inherit}
      .pp .card:hover,.pp .card:focus-visible{background:#fff;border-color:rgba(181,48,27,.45);outline:none}
      .pp .card img{width:64px;height:64px;object-fit:cover;border-radius:4px;flex:none;background:#ddd}
      .pp .card b{display:block;font-size:15px}.pp .card span{font-size:12.5px;opacity:.7}
      .pp .hero{width:100%;max-height:260px;object-fit:cover;border-radius:6px;margin:0 0 14px;background:#ddd}
      .pp h3{font-size:20px;margin:0 0 2px}.pp .sub{font-size:13px;opacity:.7;margin:0 0 14px}
      .pp h4{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#b5301b;margin:18px 0 6px}
      .pp p{margin:0 0 10px;white-space:pre-line}
      .pp ul{padding:0;margin:0;list-style:none}.pp li{margin:0 0 8px;font-size:13.5px}.pp li b{color:#b5301b;margin-right:6px}
      .pp .lk{display:inline-block;margin:6px 8px 0 0;padding:8px 14px;border:1px solid #b5301b;border-radius:999px;color:#b5301b;text-decoration:none;font-size:13.5px}
      .pp .lk:hover{background:#b5301b;color:#fff}
      .pp .vt{background:none;border:0;color:#b5301b;font:inherit;font-size:14px;cursor:pointer;padding:0;margin:0 0 14px}
      .dica3d{position:fixed;z-index:15;pointer-events:none;padding:5px 10px;border-radius:4px;background:rgba(20,14,18,.72);color:#f6eee2;font:13px "Noto Serif JP",Georgia,serif;transform:translate(-50%,-140%);opacity:0;transition:opacity .2s;white-space:nowrap}
      @media (max-width:600px){.pp{top:auto;bottom:0;height:82vh;width:100vw;transform:translateY(105%);border-radius:14px 14px 0 0}.pp.on{transform:none}}`;
    document.head.appendChild(css);
    const pp = document.createElement("aside"); pp.className = "pp"; pp.setAttribute("aria-hidden", "true"); pp.setAttribute("role", "dialog"); document.body.appendChild(pp);
    const dica = document.createElement("div"); dica.className = "dica3d"; document.body.appendChild(dica);
    let aberto = null;
    function cabeca(sub, loja) {
      return `<header><div class="kj" style="background:${esc(loja ? loja.cor : "#b5301b")}">${esc(loja ? loja.kanji : "")}</div><div><h2>${esc(sub.name)}</h2><p class="ds">${esc(sub.desc || "")}</p></div><button class="x" aria-label="Fechar">×</button></header>`;
    }
    function lista(sub, loja) {
      pp.innerHTML = cabeca(sub, loja) + `<div class="bd">${sub.acts.map((a, i) => `<button class="card" data-i="${i}">${a.img ? `<img src="${esc(imgUrl(a.img))}" alt="" loading="lazy">` : ""}<div><b>${esc(a.t)}</b><span>${esc(a.s || "")}</span></div></button>`).join("") || "<p>Em breve.</p>"}</div>`;
      pp.querySelectorAll(".card").forEach((b) => (b.onclick = () => detalhe(sub, loja, +b.dataset.i)));
      ligar(sub, loja);
      // com uma atividade só, abre direto nela
      if (sub.acts.length === 1) detalhe(sub, loja, 0, true);
    }
    function detalhe(sub, loja, i, unico) {
      const a = sub.acts[i];
      const comp = (a.k || []).map(([c, d]) => `<li><b>${esc(c)}</b>${esc(d)}</li>`).join("");
      const links = (a.l || []).map(([n, u]) => `<a class="lk" href="${esc(safeHref(u))}" target="_blank" rel="noopener">${esc(n)}</a>`).join("");
      const corpo = a.ctx || a.apr ? `${a.ctx ? `<h4>Contexto</h4><p>${esc(a.ctx)}</p>` : ""}${a.apr ? `<h4>O que aprendi</h4><p>${esc(a.apr)}</p>` : ""}` : `<p>${esc(a.r || "")}</p>`;
      pp.innerHTML = cabeca(sub, loja) + `<div class="bd">${unico ? "" : `<button class="vt">‹ todas as atividades</button>`}${a.img ? `<img class="hero" src="${esc(imgUrl(a.img))}" alt="">` : ""}<h3>${esc(a.t)}</h3><p class="sub">${esc(a.s || "")}</p>${corpo}${comp ? `<h4>Competências</h4><ul>${comp}</ul>` : ""}${links ? `<div>${links}</div>` : ""}</div>`;
      const vt = pp.querySelector(".vt"); if (vt) vt.onclick = () => lista(sub, loja);
      ligar(sub, loja);
    }
    function ligar() { pp.querySelector(".x").onclick = fechar; }
    function abrir(id, loja) { const sub = byId[id]; if (!sub) return; aberto = id; lista(sub, loja); pp.classList.add("on"); pp.setAttribute("aria-hidden", "false"); setTimeout(() => { const x = pp.querySelector(".x"); x && x.focus(); }, 60); }
    function fechar() { pp.classList.remove("on"); pp.setAttribute("aria-hidden", "true"); aberto = null; }
    M.abrir = abrir; M.fechar = fechar;
    addEventListener("keydown", (e) => { if (e.key === "Escape" && aberto) fechar(); }, true);
    // as setas e a roda do mouse não andam pela cidade enquanto o painel está aberto
    pp.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
    pp.addEventListener("keydown", (e) => e.stopPropagation());
    pp.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true }); pp.addEventListener("touchend", (e) => e.stopPropagation(), { passive: true });

    /* ---------- clicar nas lojas ---------- */
    const alvos = []; for (const l of M.lojas || []) for (const o of l.alvos) { o.userData.loja = l; alvos.push(o); }
    // a fachada inteira do térreo também conta: uma caixa invisível na frente de cada loja
    for (const l of M.lojas || []) { const b = new T.Mesh(new T.BoxGeometry(0.2, 3.2, 3.6), new T.MeshBasicMaterial({ visible: false })); b.position.set(l.porta.x, 1.7, l.porta.z); b.userData.loja = l; scene.add(b); alvos.push(b); }
    const nomes = Object.fromEntries(Object.entries(byId).map(([k, v]) => [k, v.name]));
    const rc = new T.Raycaster(), ptr = new T.Vector2();
    const pick = (x, y) => { ptr.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); rc.setFromCamera(ptr, camera); rc.far = 40; const h = rc.intersectObjects(alvos, false)[0]; return h ? h.object.userData.loja : null; };
    const cv = M.renderer.domElement; let down = null;
    cv.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY, performance.now()]; });
    cv.addEventListener("pointerup", (e) => { if (!down) return; const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); const dt = performance.now() - down[2]; down = null; if (moved > 10 || dt > 600) return; const l = pick(e.clientX, e.clientY); if (l) abrir(l.id, l); });
    let hoverT = 0;
    cv.addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") return; const now = performance.now(); if (now - hoverT < 70) return; hoverT = now; const l = pick(e.clientX, e.clientY);
      cv.style.cursor = l ? "pointer" : ""; if (l) { dica.textContent = nomes[l.id] || ""; dica.style.left = e.clientX + "px"; dica.style.top = e.clientY + "px"; dica.style.opacity = 1; } else dica.style.opacity = 0; });
    cv.addEventListener("pointerleave", () => { dica.style.opacity = 0; });
    M.subjects = subjects;
  });
})();
