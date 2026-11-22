/* Os créditos do fim, como num jogo. Depois do lago, seguir em frente (a seta, o teclado ou o controle remoto)
   abre os créditos: a vila fica à noite, a câmera sobe devagar sobre o lago, os arrozais e o santuário até ver a
   rua acesa, e os nomes sobem na tela. No fim aparece "Um portfólio de Fernando Rateke Neto"; as palavras
   "Um portfólio de" saem, a logo entra no lugar e fica a logo com o nome, com a cidade funcionando atrás.
   Esc ou "Voltar ao passeio" devolvem ao lago, no tema de antes. */
(() => {
  const M = (window.MUNDO = window.MUNDO || {});
  M.builders = M.builders || [];
  M.builders.push(async (M) => {
    const { T, scene } = M;
    const V3 = (x, y, z) => new T.Vector3(x, y, z);
    const L = M.L;
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    /* ---------- quem aparece ---------- */
    const BLOCOS = [
      { t: "Família", k: "家族", itens: [["Avós", "Mary Land Rateke", "Fernando Rateke"], ["Tias", "Fernanda Rateke", "Caroline Rateke"], ["Tios", "Levi Galvão", "Daphne Binder"], ["Pais", "Meu pai e minha mãe"], ["Irmãs", "Yasmim De Jesus", "Raquel Rateke"]] },
      { t: "Professores", k: "先生", itens: [["Linguagens", "Natali da Silva Rego"], ["Matemática e orientação da Iniciação Científica", "Wagner de Sousa Santos"], ["e todos os professores do", "Colégio SESI de Florianópolis"]] },
      { t: "Equipe do AcousticBuild", k: "音", itens: [["", "Maria Eduarda Tessari", "Julia Veríssimo", "Sara Rotenski Pereira"]] },
      { t: "Iniciação Científica em Matemática", k: "研究", itens: [["", "Ana Maria Clara Alves Bittencourt", "Naiara Alicia Broering Rech Farrell", "Lucas Ferrari", "Maria Eduarda dos Santos Bernardo", "Larissa Miranda Medeiros", "Vitor Cunha de Souza"]] },
      { t: "Amigos", k: "友", itens: [["", "Cauã Canova", "Ana Maria Clara Alves Bittencourt", "Luana Lupi Vergara"]] },
      { t: "Arte do jogo Nós", k: "絵", itens: [["", "Luana Lupi Vergara"]] },
      { t: "Modelos 3D e texturas", k: "", itens: [["", "Poly Haven (CC0)"]] },
    ];

    /* ---------- a tela ---------- */
    const css = document.createElement("style");
    css.textContent = `
      .cred{position:fixed;inset:0;z-index:30;pointer-events:none;opacity:0;transition:opacity 1.2s;color:#f6eee2;font-family:"Noto Serif JP","Hiragino Mincho ProN",Georgia,serif;overflow:hidden}
      .cred.on{opacity:1;pointer-events:auto}
      .cred .faixa{position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,5,12,0) 18%,rgba(6,5,12,.5) 38%,rgba(6,5,12,.5) 62%,rgba(6,5,12,0) 82%);transition:opacity 2.5s}
      .cred .rolo{position:absolute;left:50%;top:0;width:min(560px,88vw);text-align:center;will-change:transform;text-shadow:0 1px 12px rgba(0,0,0,.7)}
      .cred .abre{height:62vh}
      .cred .topo{font-size:15px;letter-spacing:.42em;opacity:.8;margin-bottom:10px}
      .cred .topo b{display:block;font-size:46px;letter-spacing:.12em;font-weight:600;margin-bottom:14px;color:#ffd9a8}
      .cred section{margin:0 0 68px}
      .cred h3{margin:0 0 18px;font-weight:600;font-size:13px;letter-spacing:.32em;text-transform:uppercase;color:#f0b884}
      .cred h3 i{display:block;font-style:normal;font-size:24px;letter-spacing:.1em;color:#ffd9a8;opacity:.9;margin-bottom:6px}
      .cred .it{margin:0 0 16px}.cred .it small{display:block;font-size:12.5px;letter-spacing:.06em;opacity:.62;margin-bottom:3px}
      .cred .it span{display:block;font-size:21px;line-height:1.45}
      .cred .fim{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 1.8s;font-size:clamp(24px,4.4vw,44px);font-weight:600;letter-spacing:.02em;text-shadow:0 2px 18px rgba(0,0,0,.65);padding:0 16px}
      .cred .fim.on{opacity:1}
      .cred .fim .pre{display:inline-block;overflow:hidden;white-space:nowrap;max-width:9.5em;opacity:1;margin-right:.32em;font-weight:400;opacity:.85;transition:max-width 1.4s cubic-bezier(.6,0,.2,1),opacity .7s,margin 1.4s}
      .cred .fim .logo{display:inline-block;width:0;height:1.5em;margin-right:0;opacity:0;transform:scale(.6);transition:width 1.4s cubic-bezier(.6,0,.2,1),margin 1.4s,opacity 1s .5s,transform 1.2s .4s cubic-bezier(.2,1.4,.4,1);border-radius:22%;box-shadow:0 4px 24px rgba(0,0,0,.45)}
      .cred .fim.logo-on .pre{max-width:0;opacity:0;margin-right:0}
      .cred .fim.logo-on .logo{width:1.5em;margin-right:.45em;opacity:1;transform:none}
      .cred .fim .nome{white-space:nowrap}
      .cred .bts{position:absolute;bottom:22px;left:0;right:0;display:flex;justify-content:center;gap:10px;opacity:0;transition:opacity 1s}
      .cred .bts.on{opacity:1}
      .cred .bts button{padding:10px 18px;border-radius:999px;border:1px solid rgba(246,238,226,.45);background:rgba(20,14,18,.4);color:#f6eee2;font:14px "Noto Serif JP",Georgia,serif;cursor:pointer;backdrop-filter:blur(4px)}
      .cred .pular{position:absolute;right:18px;bottom:18px;padding:7px 14px;border-radius:999px;border:1px solid rgba(246,238,226,.3);background:rgba(20,14,18,.3);color:rgba(246,238,226,.75);font:13px "Noto Serif JP",Georgia,serif;cursor:pointer;transition:opacity .6s}
      .cred-veu{position:fixed;inset:0;z-index:31;background:#05040a;opacity:0;pointer-events:none;transition:opacity .9s}.cred-veu.on{opacity:1}
      body.creditos .cam-ui,body.creditos .cantos,body.creditos .marcas,body.creditos .apr,body.creditos .dica3d{opacity:0!important;pointer-events:none!important}
      @media (prefers-reduced-motion:reduce){.cred .fim .pre,.cred .fim .logo{transition:none}}`;
    document.head.appendChild(css);
    const tela = document.createElement("div"); tela.className = "cred"; tela.setAttribute("aria-hidden", "true");
    const secoes = BLOCOS.map((b) => `<section><h3>${b.k ? `<i>${esc(b.k)}</i>` : ""}${esc(b.t)}</h3>${b.itens.map(([papel, ...nomes]) => `<div class="it">${papel ? `<small>${esc(papel)}</small>` : ""}${nomes.map((n) => `<span>${esc(n)}</span>`).join("")}</div>`).join("")}</section>`).join("");
    tela.innerHTML = `<div class="faixa"></div><div class="rolo"><div class="abre"></div><div class="topo"><b>感謝</b>OBRIGADO A QUEM VEIO JUNTO</div><div style="height:70px"></div>${secoes}</div>
      <div class="fim" role="status"><span class="pre">Um portfólio de</span><img class="logo" src="/rateke-icone.svg" alt=""><span class="nome">Fernando Rateke Neto</span></div>
      <button class="pular" type="button">Pular</button>
      <div class="bts"><button type="button" class="volta">Voltar ao passeio</button></div>`;
    document.body.appendChild(tela);
    const veu = document.createElement("div"); veu.className = "cred-veu"; document.body.appendChild(veu);
    const rolo = tela.querySelector(".rolo"), fim = tela.querySelector(".fim"), bts = tela.querySelector(".bts"), pular = tela.querySelector(".pular"), faixa = tela.querySelector(".faixa");
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));

    /* ---------- o voo da câmera ---------- */
    const lagoZ = L.LAGO.z, ya = L.Y_AGUA;
    const caminhoCam = (p0) => new T.CatmullRomCurve3([p0.clone(), V3(5, ya + 9, lagoZ + 40), V3(20, 30, -250), V3(24, 46, -178), V3(16, 40, -114), V3(4, 16, -72), V3(-1, 6.5, -50)], false, "centripetal");
    const caminhoOlho = (l0) => new T.CatmullRomCurve3([l0.clone(), V3(0, ya + 6, lagoZ + 4), V3(0, 12, -185), V3(0, 14, -115), V3(0, 5, -25), V3(0, 4, 0), V3(0.5, 3, 20)], false, "centripetal");
    let ativo = false, t0 = 0, CP = null, CO = null, DUR = 70, rolar = [3, 60], fase = 0, tema0 = "entardecer";
    const pos = V3(0, 0, 0), olho = V3(0, 0, 0), fimP = V3(0, 0, 0), fimO = V3(0, 0, 0);
    const suave = (x) => x * x * (3 - 2 * x);

    M.cinema = null;
    function quadro(t, dt, cam) {
      const e = performance.now() / 1000 - t0;
      if (e < DUR) { const u = suave(Math.min(1, Math.max(0, e / DUR))); CP.getPoint(u, pos); CO.getPoint(u, olho); }
      else { // parada no fim: a câmera respira devagar dentro da rua acesa
        const k = (e - DUR) * 0.035; pos.set(fimP.x + Math.sin(k) * 0.8, fimP.y + Math.sin(k * 0.7) * 0.3, fimP.z + (1 - Math.cos(k)) * 1.5); olho.copy(fimO); }
      cam.position.copy(pos); cam.lookAt(olho);
      // o rolo dos nomes
      // o rolo sobe até o último nome sair por cima; aí vem o nome final, depois a logo, depois o botão
      const r = Math.min(1, Math.max(0, (e - rolar[0]) / (rolar[1] - rolar[0])));
      rolo.style.transform = `translate(-50%, ${(-r * rolo.offsetHeight).toFixed(1)}px)`;
      const f = e > rolar[1] + 8 ? 3 : e > rolar[1] + 5 ? 2 : e > rolar[1] + 0.8 ? 1 : 0;
      if (f !== fase) { fase = f; fim.classList.toggle("on", f >= 1); fim.classList.toggle("logo-on", f >= 2); bts.classList.toggle("on", f >= 3); faixa.style.opacity = f >= 1 ? "0.35" : "1"; pular.style.opacity = f >= 1 ? "0" : "1"; }
    }

    async function comecar(inicio = 0) {
      if (ativo || !M.aplicarTema) return; ativo = true;
      if (M.dentro && M.sair) await M.sair();
      M.fechar && M.fechar(); M.musica && M.musica();
      veu.classList.add("on"); await espera(950);
      tema0 = M.tema || "entardecer"; await M.aplicarTema("noite"); if (scene.fog) scene.fog.density *= 0.45;
      document.body.classList.add("creditos"); tela.classList.add("on"); tela.setAttribute("aria-hidden", "false");
      fase = -1;
      // o rolo leva o tempo que os nomes pedem (uns 40 px por segundo), e o voo acaba um pouco depois do nome final
      rolar = [3, 3 + Math.max(30, rolo.offsetHeight / 42)]; DUR = rolar[1] + 7;
      const cam = M.camera; const l0 = V3(0, 0, -1).applyQuaternion(cam.quaternion).multiplyScalar(30).add(cam.position);
      CP = caminhoCam(cam.position); CO = caminhoOlho(l0); CP.getPoint(1, fimP); CO.getPoint(1, fimO);
      t0 = performance.now() / 1000 - inicio; M.cinema = quadro;
      await espera(200); veu.classList.remove("on");
      setTimeout(() => tela.querySelector(".volta").focus({ preventScroll: true }), 100);
    }
    async function sair() {
      if (!ativo) return; veu.classList.add("on"); await espera(900);
      M.cinema = null; tela.classList.remove("on"); tela.setAttribute("aria-hidden", "true"); document.body.classList.remove("creditos");
      await M.aplicarTema(tema0); ativo = false; await espera(150); veu.classList.remove("on");
    }
    // "Pular" vai direto para o nome final
    pular.addEventListener("click", () => { if (!ativo) return; t0 = performance.now() / 1000 - (rolar[1] + 0.4); });
    tela.querySelector(".volta").addEventListener("click", sair);
    addEventListener("keydown", (e) => { if (!ativo) return; if (e.key === "Escape") sair(); e.stopPropagation(); }, true);
    M.creditos = comecar; M.sairCreditos = sair; M.emCreditos = () => ativo; M.credSeek = (e) => { t0 = performance.now() / 1000 - e; };
  });
})();
