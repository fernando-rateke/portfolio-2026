/* O portfólio dentro da cidade. Cada loja da rua é uma matéria (a placa em japonês, o nome em português ao passar o
   mouse); a cafeteria é o "Quem sou". No resto do caminho: as lanternas da escadaria guardam os certificados, o santuário
   os agradecimentos, o quadro de emas os recados dos visitantes, a casa do arrozal a jornada (1º e 2º ano) e o torii
   do lago o futuro. Clicar ou tocar abre um painel de papel; as atividades vêm de /cidade/atividades.json. */
(() => {
  const M = (window.MUNDO = window.MUNDO || {});
  M.builders = M.builders || [];
  const PERFIL = { id: "perfil", name: "Quem sou", desc: "Fernando Rateke Neto", acts: [
    { t: "Quem sou", s: "Fernando Rateke Neto", r: "Desenvolvedor de sistemas em formação, em Florianópolis (SC). Ensino Médio integrado ao Técnico em Análise e Desenvolvimento de Sistemas no SESI SENAI, turma 3B, 2026.\n\nDesde cedo tive afinidade com as exatas, principalmente matemática, biologia e programação. Gosto de desafios de lógica, de interfaces que se explicam sozinhas e de soluções que funcionam bem. Além do código, levo comigo a pesquisa científica pela Iniciação Científica.", img: "perfil/retrato.jpg" },
    { t: "Interesses", s: "o que eu gosto", r: "Studio Ghibli (O Castelo Animado, A Viagem de Chihiro, Meu Amigo Totoro), animes (Frieren, Attack on Titan, Tokyo Ghoul), cultura japonesa e caligrafia, jogar e criar mundos." },
  ] };
  const JORNADA = { id: "jornada", name: "A jornada", desc: "1º e 2º ano: o que veio antes", acts: [
    ["trem/infancia-aviao.jpg", "Infância", "Uma das primeiras viagens", "Pequeno, sentado na janela do avião. A jornada começa bem antes de a gente perceber."],
    ["trem/florianopolis.jpg", "Florianópolis", "Fernando Rateke", "Registro pessoal e início do percurso como desenvolvedor e pesquisador."],
    ["trem/grupo-5.jpg", "Iniciação Científica", "Antigo Grupo 5", "O antigo Grupo 5 de Iniciação Científica: pesquisa e desenvolvimento em equipe."],
    ["trem/ic-2026.jpg", "Iniciação Científica", "Seleção da IC 2026", "A nova seleção da Iniciação Científica, reunida diante da bandeira do grupo."],
    ["trem/tias.jpg", "Aeroporto de Florianópolis", "Com as minhas tias", "Antes do embarque para a FEBRACE, com as minhas tias, a quem devo um agradecimento enorme por tudo."],
    ["trem/aeroporto.jpg", "Aeroporto de Florianópolis", "A bandeira na mala", "Com a bandeira da Iniciação Científica no Aeroporto de Florianópolis, antes de seguir para São Paulo."],
    ["trem/febrace-2026.jpg", "Aeroporto de Florianópolis", "Rumo à FEBRACE 2026", "A equipe reunida antes do voo para São Paulo."],
    ["trem/sao-paulo.jpg", "São Paulo", "São Paulo", "A roda-gigante e a imersão durante a participação num evento científico e acadêmico nacional."],
    ["trem/febrace.jpg", "FEBRACE · São Paulo", "FEBRACE", "Apresentação e defesa de projeto na Feira Brasileira de Ciências e Engenharia, em São Paulo."],
    ["trem/dual.jpg", "Feira internacional", "DUAL International Fair 2026", "A equipe da Iniciação Científica na DUAL International Fair 2026."],
    ["trem/febic-estande.jpg", "XI FEBIC · Joinville", "O estande do AcousticBuild", "O AcousticBuild apresentado na XI Feira Brasileira de Iniciação Científica, em Joinville."],
    ["trem/febic-equipe.jpg", "XI FEBIC · Joinville", "Certificado e troféu", "A equipe do AcousticBuild com o certificado, o troféu e as medalhas da FEBIC."],
    ["trem/febic-palco.jpg", "XI FEBIC · Joinville", "2º lugar", "Segundo lugar em Ciências Exatas e da Terra, no Ensino Médio, com credencial para a FoCiTeCu 2027, na Argentina."],
    ["trem/febic-amigos.jpg", "XI FEBIC · Joinville", "Fim de feira", "Medalhas, troféus e amigos de outro país no encerramento da XI FEBIC."],
  ].map(([img, s, t, r]) => ({ img, s, t, r })) };
  const CERTIFICADOS = { id: "certificados", name: "Certificados", desc: "Feiras e Iniciação Científica", acts: [
    ["Infomatrix 2025", "Credencial para a MILSET Expo 2026, em Fortaleza", "AcousticBuild"],
    ["XI FEBIC 2026", "2º lugar em Ciências Exatas e da Terra e credencial para a FoCiTeCu 2027, na Argentina", "AcousticBuild"],
    ["FEBRACE 2026", "Participação na Feira Brasileira de Ciências e Engenharia", "AcousticBuild"],
    ["DUAL International Fair 2025", "Participação", "AcousticBuild"],
    ["DUAL International Fair 2026", "Participação", "AcousticBuild"],
    ["Iniciação Científica", "Pesquisa das normas EN 12354 e do cálculo de ruído", "SESI SENAI"],
  ].map(([t, s, p]) => ({ t, s, r: `${s}.\nProjeto: ${p}.` })) };
  const AGRADECIMENTOS = { id: "agradecimentos", name: "Agradecimentos", desc: "Quem veio junto", acts: [{ t: "Quem veio junto", s: "Gratidão", r: "Com as minhas tias, a quem devo um agradecimento enorme por tudo.", img: "trem/tias.jpg" }] };
  const FUTURO = { id: "futuro", name: "Perspectivas para o futuro", desc: "O que vem depois", acts: [{ t: "Perspectivas para o futuro", s: "em breve", r: "Este texto ainda vai ser escrito." }] };
  const SELO = { perfil: ["喫茶", "#2a3a5a"], jornada: ["旅", "#3a5a3a"], certificados: ["証", "#b5301b"], agradecimentos: ["感謝", "#7a2a22"], futuro: ["未来", "#2a4a6a"], emas: ["絵馬", "#8a5a2a"] };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const imgUrl = (u) => (!u ? "" : /^https?:|^\//.test(u) ? u : "/vale/" + u);
  const safeHref = (u) => (/^(https?:\/\/|\/)/.test(u || "") ? u : "#");

  M.builders.push(async (M) => {
    const { T, camera, scene } = M;
    let subjects = [];
    try { subjects = await fetch("/cidade/atividades.json").then((r) => (r.ok ? r.json() : [])); } catch (e) { subjects = []; }
    const byId = Object.fromEntries(subjects.map((s) => [s.id, s])); for (const x of [PERFIL, JORNADA, CERTIFICADOS, AGRADECIMENTOS, FUTURO]) byId[x.id] = x;
    // a loja do curso técnico reúne as matérias do técnico (cada uma com o seu computador lá dentro)
    byId.tecnico = { id: "tecnico", name: "Curso Técnico", desc: "Técnico em Desenvolvimento de Sistemas: as matérias do curso", acts: [], subs: subjects.filter((x) => x.cat === "curso-tecnico") };
    M.secao = (id) => byId[id];

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
      .pp .card img{width:64px;height:64px;object-fit:contain;border-radius:4px;flex:none;background:#e6dcc8}
      .pp .card b{display:block;font-size:15px}.pp .card span{font-size:12.5px;opacity:.7}
      .pp .hero{width:100%;max-height:340px;object-fit:contain;border-radius:6px;margin:0 0 14px;background:#e6dcc8}
      .pp h3{font-size:20px;margin:0 0 2px}.pp .sub{font-size:13px;opacity:.7;margin:0 0 14px}
      .pp h4{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#b5301b;margin:18px 0 6px}
      .pp p{margin:0 0 10px;white-space:pre-line}
      .pp ul{padding:0;margin:0;list-style:none}.pp li{margin:0 0 8px;font-size:13.5px}.pp li b{color:#b5301b;margin-right:6px}
      .pp .lk{display:inline-block;margin:6px 8px 0 0;padding:8px 14px;border:1px solid #b5301b;border-radius:999px;color:#b5301b;text-decoration:none;font-size:13.5px}
      .pp .lk:hover{background:#b5301b;color:#fff}
      .pp .vt{background:none;border:0;color:#b5301b;font:inherit;font-size:14px;cursor:pointer;padding:0;margin:0 0 14px}
      .pp form{display:grid;gap:10px;margin:0 0 22px}.pp label{display:grid;gap:4px;font-size:13px}
      .pp input,.pp textarea{font:inherit;padding:9px 11px;border-radius:6px;border:1px solid rgba(60,40,30,.25);background:#fffaf2;color:inherit}
      .pp .trap{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
      .pp .btn{justify-self:start;padding:10px 18px;border-radius:999px;border:0;background:#b5301b;color:#fff;font:inherit;cursor:pointer}
      .pp .nota{font-size:12.5px;opacity:.75;margin:0}
      .pp .ema{padding:12px 14px;margin:0 0 10px;border-radius:6px;background:#e9d8b8;border:1px solid rgba(90,60,30,.25)}.pp .ema b{display:block;color:#7a2a22}.pp .ema span{font-size:12px;opacity:.65}
      .marcas{position:fixed;inset:0;pointer-events:none;z-index:4}
      .marca{position:absolute;left:0;top:0;display:flex;align-items:center;gap:7px;padding:5px 12px 5px 5px;border-radius:999px;border:1px solid rgba(255,214,160,.55);background:rgba(28,16,20,.62);color:#fff2e2;font:500 13px "Noto Serif JP",Georgia,serif;white-space:nowrap;cursor:pointer;pointer-events:auto;opacity:0;visibility:hidden;backdrop-filter:blur(3px);box-shadow:0 0 18px rgba(255,170,90,.25)}
      .marca.on{visibility:visible}.marca:hover,.marca:focus-visible{background:rgba(181,48,27,.85);outline:none}
      .marca i{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:12px;color:#2a1610;background:radial-gradient(circle,#ffe6b8 0 40%,#ffb060 75%);animation:marcaPulso 2.4s ease-in-out infinite}
      .marca::after{content:"";position:absolute;left:50%;bottom:-7px;width:1px;height:7px;background:rgba(255,214,160,.6)}
      @keyframes marcaPulso{50%{box-shadow:0 0 0 6px rgba(255,176,96,0)}0%{box-shadow:0 0 0 0 rgba(255,176,96,.55)}}
      @media (prefers-reduced-motion:reduce){.marca i{animation:none}}
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
      if (sub.subs) { pp.innerHTML = cabeca(sub, loja) + `<div class="bd">${sub.subs.map((x) => `<button class="card" data-id="${esc(x.id)}"><div><b>${esc(x.name)}</b><span>${x.acts.length} ${x.acts.length === 1 ? "atividade" : "atividades"}</span></div></button>`).join("")}</div>`;
        pp.querySelectorAll(".card").forEach((b) => (b.onclick = () => abrir(b.dataset.id))); ligar(); return; }
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
    function abrir(id, loja) { const sub = byId[id]; if (!sub) return; aberto = id; if (!loja) { const k = (M.KANJI || {})[id] || SELO[id]; if (k) loja = { kanji: k[0], cor: k[1] }; } lista(sub, loja); mostrar(); }
    function mostrar() { pp.classList.add("on"); pp.setAttribute("aria-hidden", "false"); setTimeout(() => { const x = pp.querySelector(".x"); if (aberto && x) x.focus(); }, 60); }
    function fechar() { if (pp.contains(document.activeElement)) document.activeElement.blur(); pp.classList.remove("on"); pp.setAttribute("aria-hidden", "true"); aberto = null; }
    M.abrir = abrir; M.fechar = fechar; M.painelAberto = () => aberto;
    const seloDe = (id) => { const k = (M.KANJI || {})[id] || SELO[id]; return k ? { kanji: k[0], cor: k[1] } : null; };
    M.abrirAtividade = (id, i) => { const sub = byId[id]; if (!sub || !sub.acts[i]) return; aberto = id; detalhe(sub, seloDe(id), i, sub.acts.length === 1); mostrar(); };
    addEventListener("keydown", (e) => { if (e.key === "Escape" && aberto) fechar(); }, true);
    // as setas e a roda do mouse não andam pela cidade enquanto o painel está aberto
    pp.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
    pp.addEventListener("keydown", (e) => { if (aberto) e.stopPropagation(); });
    pp.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true }); pp.addEventListener("touchend", (e) => e.stopPropagation(), { passive: true });

    /* ---------- o quadro de emas: recados dos visitantes, pendurados no santuário ---------- */
    let emas = [];
    const meus = () => { try { return JSON.parse(localStorage.getItem("cidade-emas") || localStorage.getItem("biblioteca-meus") || "[]"); } catch (e) { return []; } };
    async function carregarEmas() {
      let list = [];
      try { const d = await fetch("/api/ema", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)); list = d && d.ok ? d.emas || [] : []; } catch (e) { list = []; }
      const m = meus(); emas = m.concat(list.filter((e) => !m.some((x) => x.id && x.id === e.id))); pendurar();
    }
    function abrirEmas() {
      aberto = "emas";
      pp.innerHTML = cabeca({ name: "Quadro de emas", desc: "No Japão, os visitantes de um santuário escrevem desejos em plaquinhas de madeira e deixam penduradas. Deixe a sua." }, { kanji: SELO.emas[0], cor: SELO.emas[1] }) +
        `<div class="bd"><form id="fEma"><label>Seu nome<input name="nome" maxlength="30" required></label><label>Recado ou desejo<textarea name="recado" rows="3" maxlength="140" required></textarea></label>
        <input class="trap" name="site" tabindex="-1" autocomplete="off" aria-hidden="true"><button class="btn" type="submit">Pendurar no quadro</button><p class="nota" id="fNota">Até 140 letras. Os recados aparecem para todos depois de aprovados.</p></form>
        ${emas.map((e) => `<div class="ema"><b>${esc(e.nome || "Visitante")}</b>${esc(e.recado || "")}<br><span>${e.criado_em ? new Date(e.criado_em).toLocaleDateString("pt-BR") : ""}${e.meu ? " · o seu" : ""}</span></div>`).join("")}</div>`;
      pp.querySelector(".x").onclick = fechar;
      pp.querySelector("#fEma").addEventListener("submit", (ev) => {
        ev.preventDefault(); const f = ev.target, nota = pp.querySelector("#fNota");
        const body = { nome: f.nome.value, recado: f.recado.value, cor: ["madeira", "vermelho", "azul", "verde"][Math.floor(Math.random() * 4)], site: f.site.value };
        nota.textContent = "Pendurando…";
        fetch("/api/ema", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json().then((d) => ({ ok: r.ok, d }))).then(({ ok, d }) => {
          if (!ok || !d.ok) { nota.textContent = d && d.motivo === "espere" ? "Calma: um recado a cada 30 segundos." : d && d.motivo === "filtro" ? "Esse recado não passou no filtro (sem links nem palavrões)." : "Não deu para guardar agora. Tente de novo daqui a pouco."; return; }
          const meu = { id: d.ema && d.ema.id, nome: body.nome, recado: body.recado, cor: body.cor, criado_em: new Date().toISOString(), meu: true };
          try { localStorage.setItem("cidade-emas", JSON.stringify([meu].concat(meus()).slice(0, 6))); } catch (e) { /* sem storage */ }
          emas.unshift(meu); pendurar(); abrirEmas();
          const n2 = pp.querySelector("#fNota"); if (n2) n2.textContent = d.moderado ? "Pendurado. Os outros visitantes vão ver assim que for aprovado." : "Pendurado no quadro.";
        }).catch(() => { nota.textContent = "Sem conexão agora."; });
      });
      mostrar();
    }
    // o quadro de madeira com telhadinho e as plaquinhas de cinco lados, no pátio do santuário
    const quadro = new T.Group(); const placas = [];
    if (M.J) {
      const J = M.J, MD = J.MADEIRA_ESC(), HK = J.HINOKI();
      const box = (w, h, d, m, x, y, z) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; quadro.add(o); return o; };
      for (const x of [-1.3, 1.3]) box(0.12, 2.1, 0.12, MD, x, 1.05, 0);
      for (const y of [1.0, 1.42, 1.84]) box(2.7, 0.06, 0.06, HK, 0, y, 0.02);
      const teto = box(3.1, 0.08, 0.7, MD, 0, 2.16, 0); teto.rotation.x = 0.0; box(3.2, 0.1, 0.12, MD, 0, 2.24, 0);
      const sh = new T.Shape(); const w = 0.2, hh = 0.15; sh.moveTo(-w / 2, -hh / 2); sh.lineTo(w / 2, -hh / 2); sh.lineTo(w / 2, hh * 0.18); sh.lineTo(0, hh / 2); sh.lineTo(-w / 2, hh * 0.18); sh.closePath();
      const geo = new T.ShapeGeometry(sh); const uv = geo.attributes.uv, pg = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (pg.getX(i) + w / 2) / w, (pg.getY(i) + hh / 2) / hh);
      for (let r = 0; r < 3; r++) for (let k = 0; k < 11; k++) { const m = new T.Mesh(geo, new T.MeshStandardMaterial({ color: "#d8b888", roughness: 0.8, side: T.DoubleSide })); m.position.set(-1.15 + k * 0.23 + (r % 2) * 0.1, [0.92, 1.34, 1.76][r], 0.06); m.rotation.z = (Math.random() - 0.5) * 0.12; quadro.add(m); placas.push(m); }
      quadro.position.set(7.2, (M.L ? M.L.Y_TOPO : 18), -132); quadro.rotation.y = -Math.PI / 2; scene.add(quadro);
    }
    function pendurar() {
      placas.forEach((m, k) => { const e = emas[k]; const old = m.material.map; if (old) old.dispose();
        m.material.map = M.canvasTex(128, 96, (c, W, H) => { c.fillStyle = "#d9b98a"; c.fillRect(0, 0, W, H); c.strokeStyle = "rgba(90,60,30,.5)"; c.lineWidth = 2; for (let y = 8; y < H; y += 11) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y + 2); c.stroke(); }
          if (e) { c.fillStyle = "#7a2418"; c.font = `600 15px ${M.JPS}`; c.textAlign = "center"; c.fillText(String(e.nome || "").slice(0, 12), W / 2, 44); c.fillStyle = "#3a2618"; c.font = `11px ${M.JPS}`; c.fillText(String(e.recado || "").slice(0, 18), W / 2, 66); } });
        m.material.color.set("#ffffff"); m.material.needsUpdate = true; });
    }

    /* ---------- o que se clica na cidade ---------- */
    const alvos = [];
    const marca = (o, nome, acao) => { o.userData.acao = { nome, acao }; alvos.push(o); };
    /* marcadores: o nome de cada coisa que abre, aceso e flutuando no lugar, para ninguém ter de adivinhar.
       Aparecem quando a câmera está perto (alcance) e somem com o painel aberto; tocar no nome também abre. */
    const camada = document.createElement("div"); camada.className = "marcas"; if (!M.Q.has("limpo")) document.body.appendChild(camada);
    const marcas = [];
    const marcador = (nome, p, acao, alcance = 30, kanji = "") => { const b = document.createElement("button"); b.type = "button"; b.className = "marca";
      b.innerHTML = `<i>${esc([...kanji][0] || "")}</i><span>${esc(nome)}</span>`; b.addEventListener("click", (e) => { e.stopPropagation(); acao(); });
      camada.appendChild(b); const m = { b, p, alcance, on: false }; marcas.push(m); return m; };
    // os nomes dentro da sala atual (lojas.js chama ao entrar e ao sair)
    M.marcasSala = (lista) => { for (let i = marcas.length - 1; i >= 0; i--) if (marcas[i].sala) { marcas[i].b.remove(); marcas.splice(i, 1); }
      for (const a of lista) { const nm = a.nome.length > 30 ? a.nome.slice(0, 28).trim() + "…" : a.nome; const m = marcador(nm, a.topo, a.acao, 30); m.sala = true; m.b.title = a.nome; } };
    const pv = new T.Vector3();
    const postos = [];
    M.ticks.push(() => {
      const fechado = !aberto && !document.body.classList.contains("apresentando");
      const cam = M.dentro ? M.dentro.camera : camera, naSala = !!M.dentro;
      // do mais perto para o mais longe; um nome que cairia em cima de outro já posto fica escondido
      for (const m of marcas) { m.d = m.p.distanceTo(cam.position); }
      postos.length = 0;
      for (const m of [...marcas].sort((a, b) => a.d - b.d)) {
        pv.copy(m.p).project(cam);
        let ver = fechado && !!m.sala === naSala && m.d < m.alcance && pv.z < 1 && Math.abs(pv.x) < 1.02 && Math.abs(pv.y) < 1.02;
        const x = (pv.x * 0.5 + 0.5) * innerWidth, y = (-pv.y * 0.5 + 0.5) * innerHeight, w = m.w || (m.w = m.b.offsetWidth || 160);
        if (ver) for (const q of postos) if (Math.abs(q.x - x) < (q.w + w) / 2 + 6 && Math.abs(q.y - y) < 34) { ver = false; break; }
        if (ver) { postos.push({ x, y, w }); m.b.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`; m.b.style.opacity = Math.min(1, (m.alcance - m.d) / 6).toFixed(2); }
        if (ver !== m.on) { m.on = ver; m.b.classList.toggle("on", ver); if (ver) m.w = m.b.offsetWidth || m.w; }
      }
    });
    const caixa = (w, h, d, x, y, z, ry = 0) => { const b = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshBasicMaterial({ visible: false, side: T.DoubleSide })); b.position.set(x, y, z); b.rotation.y = ry; scene.add(b); return b; };
    const nomes = Object.fromEntries(Object.entries(byId).map(([k, v]) => [k, v.name]));
    for (const l of M.lojas || []) { const go = () => (M.temSala && M.temSala(l.id) ? M.entrar(l.id) : abrir(l.id, l)); for (const o of l.alvos) marca(o, nomes[l.id], go); marca(caixa(0.2, 3.2, 3.6, l.porta.x, 1.7, l.porta.z), nomes[l.id], go);
      marcador(nomes[l.id], new T.Vector3(l.porta.x - l.side * 0.9, 3.35, l.porta.z), go, 42, l.kanji); }
    if (M.L) {
      const L = M.L, YT = L.Y_TOPO;
      // os pilares dos torii da escadaria levam as inscrições: os certificados
      // as lanternas de pedra da escadaria guardam os certificados
      for (const t of M.torosEscada || []) marca(caixa(1.1, 2.2, 1.1, t.position.x, t.position.y + 1.0, t.position.z), "Certificados", () => abrir("certificados"));
      { const ts = M.torosEscada || []; const t = ts.reduce((a, b) => (b.position.x > 0 && Math.abs(b.position.z + 99) < Math.abs(a.position.z + 99) ? b : a), ts[0]); if (t) marcador("Certificados", t.position.clone().add(new T.Vector3(0, 2.5, 0)), () => abrir("certificados"), 26, "証"); }
      if (M.haiden) marcador("Agradecimentos", new T.Vector3(M.haiden.position.x, YT + 5.4, M.haiden.position.z + 4.4), () => abrir("agradecimentos"), 34, "感謝");
      if (quadro.children.length) marcador("Quadro de emas", new T.Vector3(quadro.position.x, YT + 2.6, quadro.position.z), abrirEmas, 26, "絵馬");
      if (M.casa) marcador("A jornada", new T.Vector3(M.casa.position.x, M.casa.position.y + 8.2, M.casa.position.z), () => abrir("jornada"), 46, "旅");
      if (M.toriiLago) marcador("O futuro", new T.Vector3(M.toriiLago.position.x, L.Y_AGUA + 12.5, M.toriiLago.position.z), () => abrir("futuro"), 60, "未来");
      if (M.haiden) marca(caixa(11, 6, 8, M.haiden.position.x, YT + 3, M.haiden.position.z), "Agradecimentos", () => abrir("agradecimentos"));
      if (quadro.children.length) marca(caixa(3, 2.4, 0.6, quadro.position.x, YT + 1.2, quadro.position.z, quadro.rotation.y), "Quadro de emas", abrirEmas);
      if (M.casa) marca(caixa(9, 7, 13, M.casa.position.x, M.casa.position.y + 3.5, M.casa.position.z), "A jornada", () => abrir("jornada"));
      if (M.toriiLago) marca(caixa(10, 13, 2, M.toriiLago.position.x, L.Y_AGUA + 5, M.toriiLago.position.z), "Perspectivas para o futuro", () => abrir("futuro"));
    }
    const rc = new T.Raycaster(), ptr = new T.Vector2();
    const pick = (x, y) => (M.dentro ? M.dentro.pick(x, y) : pickCidade(x, y));
    const pickCidade = (x, y) => { ptr.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); rc.setFromCamera(ptr, camera); rc.far = 60; const h = rc.intersectObjects(alvos, false)[0]; return h ? h.object.userData.acao : null; };
    M.pick = pick; M.clicar = (x, y) => { const a = pick(x, y); if (a) a.acao(); return !!a; };
    const cv = M.renderer.domElement; let down = null;
    cv.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY, performance.now()]; });
    cv.addEventListener("pointerup", (e) => { if (!down) return; const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); const dt = performance.now() - down[2]; down = null; if (moved > 10 || dt > 600) return; M.clicar(e.clientX, e.clientY); });
    let hoverT = 0;
    cv.addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") return; const now = performance.now(); if (now - hoverT < 70) return; hoverT = now; const a = pick(e.clientX, e.clientY);
      cv.style.cursor = a ? "pointer" : ""; if (a) { dica.textContent = a.nome || ""; dica.style.left = e.clientX + "px"; dica.style.top = e.clientY + "px"; dica.style.opacity = 1; } else dica.style.opacity = 0; });
    cv.addEventListener("pointerleave", () => { dica.style.opacity = 0; });
    carregarEmas();
  });
})();
