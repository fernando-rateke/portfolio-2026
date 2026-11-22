/* O portfólio dentro da cidade. Cada loja da rua é uma matéria (a placa em japonês, o nome em português ao passar o
   mouse); a cafeteria é o "Quem sou". No resto do caminho: o mural de avisos da escadaria guarda os certificados, o
   santuário os agradecimentos (o mural de nomes, as quatro lanternas e a placa da família na casa do arrozal), o quadro
   de emas os recados dos visitantes, a casa do arrozal a jornada (1º e 2º ano) e o torii do lago o futuro. Clicar ou tocar abre um painel de papel; as atividades vêm de /cidade/atividades.json. */
(() => {
  const M = (window.MUNDO = window.MUNDO || {});
  M.builders = M.builders || [];
  const PERFIL = { id: "perfil", name: "Quem sou", desc: "Fernando Rateke Neto", acts: [
    { t: "Quem sou", s: "Fernando Rateke Neto", r: "Sou Fernando Rateke Neto, nascido em Florianópolis, Santa Catarina. Sou uma pessoa com vontade de aprender, explorar novas possibilidades e compreender melhor o mundo ao meu redor. Gosto de questionar, experimentar e enxergar diferentes perspectivas sobre as coisas, especialmente quando tenho a oportunidade de transformar uma ideia em algo concreto.", img: "perfil/retrato.jpg" },
    { t: "O que me move", s: "tecnologia, jogos, música e arte", r: "Tenho um interesse especial pela tecnologia e, principalmente, pela programação. Gosto da possibilidade de compreender como as coisas funcionam, resolver problemas e transformar conceitos em soluções reais. Entre as áreas que mais despertam meu interesse está o desenvolvimento de jogos, especialmente pela combinação entre programação, construção de narrativas e criação de experiências interativas. Também aprecio a música, a arte e as diferentes formas de expressão, que ampliam minha percepção sobre como histórias e ideias podem ser transmitidas às pessoas." },
    { t: "O caminho que quero construir", s: "desafios e ambições", r: "Gosto de desafios e de situações que me tiram do lugar-comum. Tenho ambições que me incentivam a buscar novos conhecimentos, conhecer outras perspectivas e explorar caminhos que ainda não conheço. Mais do que seguir um percurso previamente definido, quero construir minha própria trajetória, mantendo a curiosidade, a disposição para aprender e a vontade de transformar ideias em algo significativo." },
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
  const AGRADECIMENTOS = { id: "agradecimentos", name: "Agradecimentos", desc: "Quem veio junto", acts: [
    { t: "Agradecimentos", s: "Quem veio junto", r: "Nenhuma trajetória é construída inteiramente sozinho. Ao longo dos anos, encontrei pessoas que, de diferentes maneiras, contribuíram para minha formação, acreditaram no meu potencial e fizeram parte dos momentos que me trouxeram até aqui. Este espaço é dedicado a reconhecer algumas dessas pessoas, cuja importância vai muito além do que consigo expressar em poucas palavras.\n\nA todos vocês, meu sincero agradecimento. Cada pessoa mencionada teve uma participação diferente nessa caminhada, mas todas contribuíram, de alguma maneira, para que eu chegasse até aqui." },
    { t: "À minha família", s: "Avós, tias, tios, pais e irmãs", r: "Em primeiro lugar, gostaria de agradecer à minha família, que representa a base de muitas das oportunidades que tive ao longo da minha vida.\n\nÀ minha avó, Mary Land Rateke, e ao meu avô, Fernando Rateke, por todas as oportunidades, pelo incentivo e por terem me proporcionado tantas possibilidades para que eu pudesse construir quem sou hoje. Sou grato por cada porta que me ajudaram a abrir e por tudo o que fizeram para que eu pudesse chegar até aqui.\n\nÀs minhas tias, Fernanda Rateke e Caroline Rateke, por estarem sempre presentes, pelo apoio constante e pela disposição em me ajudar sempre que precisei. Aos meus tios, Levi Galvão e Daphne Binder, pela companhia, pelos conselhos e, especialmente, por ampliarem minha visão de mundo e despertarem ainda mais meu interesse pela tecnologia.\n\nAo meu pai e à minha mãe, por acreditarem em mim, reconhecerem meu potencial e me apoiarem na busca por meus objetivos. À minha irmã, Yasmim De Jesus, por todo o apoio e por estar sempre por perto, independentemente das circunstâncias. E à minha irmã, Raquel Rateke, pelo companheirismo e por compartilhar comigo tantos momentos dessa caminhada.\n\nA cada um de vocês, meu agradecimento por tudo o que fizeram e continuam fazendo por mim. Grande parte das possibilidades que tenho hoje nasceu do apoio e da confiança que recebi de vocês.", img: "trem/tias.jpg" },
    { t: "Professora Natali da Silva Rego", s: "Aos meus professores · Linguagens", r: "Agradeço a todos os professores que fizeram parte da minha trajetória escolar e contribuíram, de alguma maneira, para minha formação. Em especial, aos professores do Colégio SESI de Florianópolis, que participaram de uma etapa tão importante do meu desenvolvimento.\n\nÀ professora Natali da Silva Rego, da área de Linguagens, por ter proporcionado experiências que contribuíram para meu desenvolvimento pessoal e por despertar em mim uma paixão que talvez eu ainda não tivesse compreendido por completo: a criação de jogos e narrativas interativas. Suas aulas me ajudaram a enxergar essa área para além do entretenimento, mostrando seu potencial artístico, criativo e expressivo. Também foram importantes para que eu compreendesse que, embora seja um caminho difícil e competitivo, ingressar nessa indústria não é impossível e que não deveria simplesmente abandonar esse sonho diante dos desafios." },
    { t: "Professor Wagner de Sousa Santos", s: "Aos meus professores · Matemática e orientação da Iniciação Científica", r: "Ao professor Wagner de Sousa Santos, da área de Matemática e orientador da Iniciação Científica, por sua contribuição fundamental para meu desenvolvimento. Durante esse período, tive a oportunidade de aprimorar habilidades que vão muito além do conhecimento técnico, como comunicação, oratória, apresentação em público, pensamento crítico, autonomia, criatividade, organização de ideias e capacidade de trabalhar em equipe. Além disso, seu incentivo e sua orientação me proporcionaram espaço para desenvolver habilidades técnicas, especialmente em programação, pesquisa científica, análise de dados, elaboração de artigos e desenvolvimento de soluções. Sou grato pela confiança, pelas oportunidades e por ter contribuído tanto para minha formação acadêmica e pessoal." },
    { t: "À Iniciação Científica", s: "A equipe do AcousticBuild e os colegas da IC", r: "Agradeço a todos que fizeram parte da Iniciação Científica em Matemática do Colégio SESI de Florianópolis. Foi uma experiência que marcou profundamente minha trajetória, permitindo que eu participasse de uma pesquisa com aplicação prática e potencial de impacto na sociedade. Mais do que os conhecimentos adquiridos, esse período me proporcionou experiências que levarei comigo, desde o contato com a pesquisa científica até as viagens, apresentações e participações em feiras que ampliaram meus horizontes e me permitiram conhecer novas realidades.\n\nUm agradecimento especial às minhas colegas de equipe, Maria Eduarda Tessari, Julia Veríssimo e Sara Rotenski Pereira, que estiveram comigo durante o desenvolvimento desse trabalho. Compartilhamos uma jornada que, apesar de exigente e trabalhosa em diversos momentos, se tornou muito mais leve, dinâmica e gratificante pela parceria que construímos. Sou grato pelas ideias, pela dedicação e por cada etapa que enfrentamos juntos.\n\nTambém gostaria de reconhecer meus colegas da Iniciação Científica: Ana Maria Clara Alves Bittencourt, Naiara Alicia Broering Rech Farrell, Lucas Ferrari, Maria Eduarda dos Santos Bernardo, Larissa Miranda Medeiros e Vitor Cunha de Souza. A convivência e as trocas ao longo desse período contribuíram para tornar essa experiência ainda mais enriquecedora.", img: "trem/ic-2026.jpg" },
    { t: "Aos meus amigos", s: "Cauã, Ana Maria Clara e Luana", r: "Por fim, agradeço a Cauã Canova, Ana Maria Clara Alves Bittencourt e Luana Lupi Vergara, pela amizade, pelo companheirismo, pelas ideias e por terem tornado essa jornada, especialmente as experiências e viagens que compartilhamos, muito mais leve e divertida. São pessoas que fizeram parte de momentos importantes e que contribuíram para que essa trajetória fosse além das responsabilidades e dos desafios acadêmicos.\n\nEm especial, gostaria de agradecer à Luana Lupi Vergara, que teve uma participação muito importante no desenvolvimento de um dos projetos mais significativos para mim. Suas ideias, sua criatividade e sua contribuição na parte artística foram fundamentais para dar forma a algo que eu idealizava. Sou grato por sua disposição em colaborar, por compartilhar suas perspectivas e por ter feito parte de uma criação que tem um significado tão especial para mim." },
  ] };
  // os grupos dos agradecimentos (índices em AGRADECIMENTOS.acts), usados pelo mural, pelas lanternas e pelos créditos
  const GRUPOS = [
    { k: "家族", nome: "Família", i: 1, nomes: ["Mary Land Rateke", "Fernando Rateke", "Fernanda Rateke", "Caroline Rateke", "Levi Galvão", "Daphne Binder", "Meu pai e minha mãe", "Yasmim De Jesus", "Raquel Rateke"] },
    { k: "先生", nome: "Professores", i: 2, nomes: ["Natali da Silva Rego", "Wagner de Sousa Santos", "Professores do Colégio SESI"] },
    { k: "研究", nome: "Iniciação Científica", i: 4, nomes: ["Maria Eduarda Tessari", "Julia Veríssimo", "Sara Rotenski Pereira", "Ana Maria Clara Alves Bittencourt", "Naiara Alicia Broering Rech Farrell", "Lucas Ferrari", "Maria Eduarda dos Santos Bernardo", "Larissa Miranda Medeiros", "Vitor Cunha de Souza"] },
    { k: "友", nome: "Amigos", i: 5, nomes: ["Cauã Canova", "Ana Maria Clara Alves Bittencourt", "Luana Lupi Vergara"] },
  ];
  const FUTURO = { id: "futuro", name: "Perspectivas para o futuro", desc: "O que vem depois", acts: [{ t: "Perspectivas para o futuro", s: "2027, os Estados Unidos e os jogos", r: "Ao concluir o Ensino Médio, pretendo dedicar 2027 a um período de transição e preparação acadêmica, conciliando uma experiência profissional com os estudos necessários para os processos seletivos de universidades nos Estados Unidos. Meu objetivo é ampliar minha formação em um ambiente que me permita aprofundar meus conhecimentos em tecnologia e programação, além de entrar em contato com novas perspectivas, culturas e oportunidades.\n\nAcredito que estudar nos Estados Unidos representa uma oportunidade de crescimento que vai além da formação acadêmica. Quero estar em contato com um ecossistema de inovação, desenvolver minha capacidade de trabalhar em ambientes diversos e ampliar minha visão sobre as possibilidades da tecnologia.\n\nNo longo prazo, pretendo direcionar minha carreira para a indústria de desenvolvimento de jogos, uma área que reúne alguns dos meus maiores interesses: programação, criatividade, arte e construção de narrativas. É um campo desafiador e competitivo, mas que representa uma das minhas maiores motivações profissionais.\n\nSei que esse caminho exige preparação, dedicação e disposição para enfrentar desafios. Por isso, vejo os próximos anos não apenas como uma etapa de formação, mas como uma oportunidade de construir as bases necessárias para transformar meus objetivos em realidade." }] };
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
    M.secao = (id) => byId[id]; M.GRUPOS = GRUPOS;

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
      pp.innerHTML = cabeca(sub, loja) + `<div class="bd">${unico ? "" : `<button class="vt">${SELO[sub.id] ? "‹ voltar à lista" : "‹ todas as atividades"}</button>`}${a.img ? `<img class="hero" src="${esc(imgUrl(a.img))}" alt="">` : ""}<h3>${esc(a.t)}</h3><p class="sub">${esc(a.s || "")}</p>${corpo}${comp ? `<h4>Competências</h4><ul>${comp}</ul>` : ""}${links ? `<div>${links}</div>` : ""}</div>`;
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
      for (const a of lista) { const nm = a.nome.length > 30 ? a.nome.slice(0, 28).trim() + "…" : a.nome; const m = marcador(nm, a.topo, a.acao, 30); m.sala = true; m.b.title = a.nome; m.obj = a.obj; m.ver = a.ver || a.topo; m.oculto = false; } };
    /* dentro da loja, um nome só aparece se a coisa estiver à vista: um raio da câmera até ela, se bater antes em
       outra coisa (o balcão, a divisória, uma estante), o nome some. Testa um nome por quadro, em rodízio. */
    const rcSala = new T.Raycaster(), dirS = new T.Vector3(); let vez = 0;
    const dela = (o, alvo) => { for (let p = o; p; p = p.parent) if (p === alvo) return true; return false; };
    const tapa = (o) => o.visible && o.material && !o.material.transparent && o.material.visible !== false;
    function testaOculto(cam) { const ms = marcas.filter((m) => m.sala); if (!ms.length) return; const m = ms[vez++ % ms.length];
      dirS.copy(m.ver).sub(cam.position); const dist = dirS.length(); rcSala.set(cam.position, dirS.normalize()); rcSala.far = dist - 0.08;
      const hs = rcSala.intersectObject(M.dentro.scene, true); m.oculto = hs.some((h) => h.object.isMesh && tapa(h.object) && !dela(h.object, m.obj)); }
    const pv = new T.Vector3();
    const postos = [];
    M.ticks.push(() => {
      const fechado = !aberto && !document.body.classList.contains("apresentando");
      const cam = M.dentro ? M.dentro.camera : camera, naSala = !!M.dentro;
      if (naSala) { testaOculto(cam); testaOculto(cam); }
      // do mais perto para o mais longe; um nome que cairia em cima de outro já posto fica escondido
      for (const m of marcas) { m.d = m.p.distanceTo(cam.position); }
      postos.length = 0;
      for (const m of [...marcas].sort((a, b) => a.d - b.d)) {
        pv.copy(m.p).project(cam);
        let ver = fechado && !!m.sala === naSala && !(m.sala && m.oculto) && m.d < m.alcance && pv.z < 1 && Math.abs(pv.x) < 1.02 && Math.abs(pv.y) < 1.02;
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
    /* uma tábua de madeira com o texto na vertical (de cima para baixo), como as tábuas de nomes dos santuários */
    function tabua(rotulo, txt, w, h, fundo, tinta) { return M.canvasTex(w, h, (c) => {
      c.fillStyle = fundo; c.fillRect(0, 0, w, h); c.strokeStyle = "rgba(90,60,30,.18)"; c.lineWidth = 1.5; for (let x = 6; x < w; x += 9) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 3, h); c.stroke(); }
      c.strokeStyle = "rgba(40,25,15,.55)"; c.lineWidth = 3; c.strokeRect(2, 2, w - 4, h - 4);
      c.save(); c.translate(w / 2, 14); c.rotate(Math.PI / 2); c.textBaseline = "middle"; c.textAlign = "left";
      let y0 = 0; if (rotulo) { c.fillStyle = "#b5301b"; c.font = `600 ${Math.round(w * 0.22)}px ${M.JPS}`; c.fillText(rotulo, 0, -w * 0.2); y0 = w * 0.17; }
      let fs = Math.round(w * (rotulo ? 0.26 : 0.4)); c.fillStyle = tinta; c.font = `600 ${fs}px ${M.JPS}`; while (c.measureText(txt).width > h - 28 && fs > 9) c.font = `600 ${(fs -= 1)}px ${M.JPS}`;
      c.fillText(txt, 0, y0); c.restore(); }); }
    const J0 = () => (M.J ? M.J.MADEIRA_ESC() : new T.MeshStandardMaterial({ color: "#4a3a2e" }));
    if (M.L) {
      const L = M.L, YT = L.Y_TOPO;
      /* os certificados ficam num kōsatsu (o mural de avisos com telhado dos antigos vilarejos), num terraço de pedra
         ao lado da escadaria. Cada certificado é uma folha pendurada; tocar numa folha abre aquele certificado. */
      if (M.J && L.KOSATSU.y != null) {
        const K = L.KOSATSU, J = M.J, MD = J.MADEIRA_ESC(), HK = J.HINOKI(), mural = new T.Group();
        const pb = (w, h, d, m, x, y, z) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; mural.add(o); return o; };
        for (const x of [-1.85, 1.85]) pb(0.16, 2.9, 0.16, MD, x, 1.45, 0);
        pb(3.5, 1.86, 0.06, HK, 0, 1.63, -0.02); pb(3.62, 0.08, 0.1, MD, 0, 2.6, 0); pb(3.62, 0.08, 0.1, MD, 0, 0.68, 0);
        for (const s of [-1, 1]) { const r = pb(5.0, 0.06, 0.62, MD, 0.35, 3.0, s * 0.27); r.rotation.x = s * 0.5; }
        pb(5.1, 0.08, 0.08, MD, 0.35, 3.15, 0);
        const folha = (c) => M.canvasTex(512, 364, (x, w, h) => {
          x.fillStyle = "#f4ead6"; x.fillRect(0, 0, w, h); x.strokeStyle = "#b5301b"; x.lineWidth = 7; x.strokeRect(16, 16, w - 32, h - 32); x.strokeStyle = "#c8a24a"; x.lineWidth = 2; x.strokeRect(28, 28, w - 56, h - 56);
          x.fillStyle = "#8a6a3a"; x.font = `600 17px ${M.JPS}`; x.textAlign = "center"; x.fillText("C E R T I F I C A D O", w / 2, 66);
          x.fillStyle = "#2a1c14"; let fs = 40; x.font = `700 ${fs}px ${M.JPS}`; while (x.measureText(c.t).width > w - 90 && fs > 22) x.font = `700 ${(fs -= 2)}px ${M.JPS}`; x.fillText(c.t, w / 2, 130);
          x.fillStyle = "#4a3a2e"; x.font = `18px ${M.JPS}`; const pal = c.s.split(" "); let lin = "", y = 180; for (const p of pal) { const t = lin ? lin + " " + p : p; if (x.measureText(t).width > w - 120) { x.fillText(lin, w / 2, y); y += 26; lin = p; } else lin = t; } if (lin) x.fillText(lin, w / 2, y);
          x.fillStyle = "#b5301b"; x.beginPath(); x.arc(w - 82, h - 78, 30, 0, 7); x.fill(); x.fillStyle = "#f4ead6"; x.font = `700 30px ${M.JP}`; x.textBaseline = "middle"; x.fillText("証", w - 82, h - 76); });
        CERTIFICADOS.acts.forEach((c, i) => { const tex = folha(c); const m = new T.Mesh(new T.PlaneGeometry(1.0, 0.71), new T.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new T.Color("#ffe8c8"), emissiveIntensity: 0.18, roughness: 0.85 }));
          m.position.set(-1.1 + (i % 3) * 1.1, 2.06 - Math.floor(i / 3) * 0.86, 0.025); m.rotation.z = (((i * 7) % 5) - 2) * 0.006; m.receiveShadow = true; mural.add(m);
          marca(m, c.t, () => M.abrirAtividade("certificados", i)); });
        // ao lado das folhas, duas tábuas: quem orientou e quem fez o AcousticBuild junto (abrem os agradecimentos)
        pb(0.66, 1.86, 0.06, HK, 2.28, 1.63, -0.02); pb(0.08, 2.9, 0.12, MD, 2.64, 1.45, 0);
        for (const [k, rot, txt, ai] of [[0, "Orientação", "Prof. Wagner de Sousa Santos", 3], [1, "Equipe AcousticBuild", "Maria Eduarda Tessari · Julia Veríssimo · Sara Rotenski Pereira", 4]]) {
          const tb = tabua(rot, txt, 120, 620, "#e9dcc0", "#2a1c14"); const m = new T.Mesh(new T.PlaneGeometry(0.26, 1.62), new T.MeshStandardMaterial({ map: tb, emissiveMap: tb, emissive: new T.Color("#ffe8c8"), emissiveIntensity: 0.18, roughness: 0.85 }));
          m.position.set(2.13 + k * 0.3, 1.63, 0.03); mural.add(m); marca(m, k ? "A equipe do AcousticBuild" : "Prof. Wagner, o orientador", () => M.abrirAtividade("agradecimentos", ai)); }
        // duas lanternas pequenas na frente, que acendem à noite
        for (const s of [-1, 1]) { const t = J.toro(0.6); t.position.set(s * 2.05, 0, 0.6); mural.add(t); (M.toros = M.toros || []).push(t); }
        mural.position.set(K.x + 0.6, K.y, K.z); mural.rotation.y = -1.05; scene.add(mural);
        marca(caixa(4.4, 3.2, 0.6, K.x + 0.6, K.y + 1.6, K.z, -1.05), "Certificados", () => abrir("certificados"));
        marcador("Certificados", new T.Vector3(K.x + 0.6, K.y + 3.6, K.z), () => abrir("certificados"), 30, "証");
      }
      if (M.haiden) marcador("Agradecimentos", new T.Vector3(M.haiden.position.x, YT + 5.4, M.haiden.position.z + 4.4), () => abrir("agradecimentos"), 34, "感謝");
      /* o mural dos nomes, ao lado do santuário: como as tábuas com os nomes de quem contribuiu que os santuários
         de verdade têm. Quatro grupos (família, professores, Iniciação Científica, amigos), cada nome numa tábua;
         tocar num grupo abre o agradecimento daquele grupo. */
      if (M.haiden && M.J) {
        const J = M.J, MD = J.MADEIRA_ESC(), nomes = new T.Group(), TW = 0.22, HW = 0.34, TH = 1.36, PX = 400, gap = 0.16;
        const larg = GRUPOS.reduce((a, g) => a + HW + g.nomes.length * TW, 0) + gap * (GRUPOS.length - 1);
        const bx = (w, h, d, m, x, y, z) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; nomes.add(o); return o; };
        for (const x of [-larg / 2 - 0.12, larg / 2 + 0.12]) bx(0.18, 2.75, 0.18, MD, x, 1.375, 0);
        bx(larg + 0.3, 0.1, 0.12, MD, 0, 2.38, 0); bx(larg + 0.3, 0.1, 0.12, MD, 0, 0.86, 0); bx(larg + 0.2, 1.5, 0.05, MD, 0, 1.62, -0.05);
        for (const s of [-1, 1]) { const r = bx(larg + 1.0, 0.06, 0.6, MD, 0, 2.86, s * 0.26); r.rotation.x = s * 0.5; } bx(larg + 1.1, 0.08, 0.08, MD, 0, 3.0, 0);
        let x0 = -larg / 2;
        GRUPOS.forEach((gr) => { const w = HW + gr.nomes.length * TW, cw = Math.round(w * PX), ch = Math.round(TH * PX);
          const tex = M.canvasTex(cw, ch, (c) => { c.fillStyle = "#2a1c14"; c.fillRect(0, 0, cw, ch);
            // a tábua do grupo: laca vermelha, o kanji grande e o nome do grupo
            const hw = HW * PX; c.fillStyle = "#a8251c"; c.fillRect(3, 0, hw - 6, ch); c.fillStyle = "#f4ead6"; c.font = `700 ${Math.round(hw * 0.62)}px ${M.JP}`; c.textAlign = "center"; c.textBaseline = "middle";
            [...gr.k].forEach((ch1, i) => c.fillText(ch1, hw / 2, hw * 0.62 + i * hw * 0.78)); c.save(); c.translate(hw / 2, hw * 2.05); c.rotate(Math.PI / 2); c.textAlign = "left"; c.font = `600 ${Math.round(hw * 0.2)}px ${M.JPS}`; c.fillText(gr.nome, 0, 0); c.restore();
            gr.nomes.forEach((n, i) => { const tw = TW * PX, x = hw + i * tw; const tb = tabua("", n, Math.round(tw) - 6, ch - 4, i % 2 ? "#e2d2b2" : "#eadcc0", "#1e140e"); c.drawImage(tb.image, x + 3, 2); }); });
          const m = new T.Mesh(new T.PlaneGeometry(w, TH), new T.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new T.Color("#ffe6c4"), emissiveIntensity: 0.16, roughness: 0.85 }));
          m.position.set(x0 + w / 2, 1.62, 0.0); m.receiveShadow = true; nomes.add(m); marca(m, `${gr.nome}: ${gr.nomes.length} ${gr.nomes.length > 1 ? "nomes" : "nome"}`, () => M.abrirAtividade("agradecimentos", gr.i));
          // nos professores, cada um abre o seu agradecimento
          if (gr.i === 2) [2, 3].forEach((ai, k) => { const b = new T.Mesh(new T.PlaneGeometry(TW, TH), new T.MeshBasicMaterial({ visible: false })); b.position.set(x0 + HW + TW * (k + 0.5), 1.62, 0.03); nomes.add(b); marca(b, AGRADECIMENTOS.acts[ai].t, () => M.abrirAtividade("agradecimentos", ai)); });
          x0 += w + gap; });
        const hp = M.haiden.position; nomes.position.set(hp.x + 8.3, YT, hp.z + 17.5); nomes.rotation.y = -1.07; scene.add(nomes);
        marcador("Quem veio junto", new T.Vector3(hp.x + 8.3, YT + 3.6, hp.z + 17.5), () => abrir("agradecimentos"), 24, "縁");

        /* quatro lanternas de papel na frente do santuário: 家族, 先生, 研究, 友. À noite, quando a gente chega ao
           santuário, elas acendem uma por vez. */
        const lant = GRUPOS.map((gr, k) => { const c = M.chochin(gr.k); c.traverse((o) => { if (o.isPointLight) o.visible = false; });
          const body = c.children.find((o) => o.isMesh && o.geometry.type === "LatheGeometry"); body.material = body.material.clone(); body.material.userData.proprio = true;
          c.scale.setScalar(1.35); c.position.set(hp.x - 3.75 + k * 2.5, YT + 3.62, hp.z + 3.74); scene.add(c);
          const fio = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.34, 4), MD); fio.position.set(c.position.x, YT + 4.15, c.position.z); scene.add(fio);
          marca(body, `${gr.k} · ${gr.nome}`, () => M.abrirAtividade("agradecimentos", gr.i)); return { m: body.material, t: 0 }; });
        if (M.luzFonte) M.luzFonte(new T.Vector3(hp.x, YT + 3.4, hp.z + 4.3), "#ff9a5a", 1.2, 9);
        let chegou = -1;
        M.ticks.push((t) => { const noite = M.tema === "noite", aqui = M.lugarAtual && M.lugares && (M.lugares[M.lugarAtual()] || {}).id === "santuario";
          if (noite && aqui && chegou < 0) chegou = t; if (!noite) chegou = -1;
          lant.forEach((l, k) => { const alvo = !noite ? 0.35 : chegou < 0 ? 0.08 : t - chegou > 0.6 + k * 0.9 ? 1.5 : 0.08; l.t += (alvo - l.t) * 0.06; l.m.emissiveIntensity = l.t * (noite ? 1 + Math.sin(t * 3 + k) * 0.04 : 1); }); });
      }
      // a família mora na casa do arrozal: a plaquinha com o nome da família (表札) na entrada
      if (M.casa) { M.casa.updateMatrixWorld(true); const tb = M.canvasTex(120, 360, (c, w, h) => { c.fillStyle = "#e8d8b8"; c.fillRect(0, 0, w, h); c.strokeStyle = "#5a4030"; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
          c.fillStyle = "#1e140e"; c.font = `700 62px ${M.JP}`; c.textAlign = "center"; c.textBaseline = "middle"; ["ラ", "テ", "ケ"].forEach((k, i) => c.fillText(k, w / 2, 62 + i * 76)); c.font = `600 22px ${M.JPS}`; c.fillText("Rateke", w / 2, h - 34); });
        const pl = new T.Mesh(new T.BoxGeometry(0.3, 0.9, 0.04), [J0(), J0(), J0(), J0(), new T.MeshStandardMaterial({ map: tb, emissiveMap: tb, emissive: new T.Color("#ffe0b0"), emissiveIntensity: 0.15, roughness: 0.8 }), J0()]);
        pl.position.copy(M.casa.localToWorld(new T.Vector3(1.1, 2.0, 3.64))); pl.rotation.y = M.casa.rotation.y; scene.add(pl);
        marca(pl, "A família", () => M.abrirAtividade("agradecimentos", 1)); marcador("A família", pl.position.clone().add(new T.Vector3(0, 2.6, 0)), () => M.abrirAtividade("agradecimentos", 1), 46, "家族"); }
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
