/* Entardecer ou Noite. A noite troca o céu (lua e estrelas), a luz do sol vira luar azulado, a névoa escurece e
   tudo o que tem luz própria acende de verdade: janelas, placas, lanternas de papel e de pedra, máquinas de bebida,
   o santuário e a casa do arrozal. A troca não recarrega a página: um véu escuro cobre a tela por um instante.
   A escolha fica guardada no navegador. */
(() => {
  const M = (window.MUNDO = window.MUNDO || {});
  M.builders = M.builders || [];
  M.builders.push(async (M) => {
    const { T, scene, renderer, sun, hemi } = M;
    const TEMAS = {
      entardecer: { exp: 0.78, fog: "#b98a7a", dens: M.leve ? 0.0082 : 0.0068, sol: ["#ff9a58", 2.4], hemi: ["#8f86b8", "#4a3028", 0.42], dir: [-26, 11, -72],
        bb: ["#ffb27a", "#8a86a8"], flor: ["#ffc8a0", "#9a8ab8"], luz: 1, emis: 1, janela: [0, 0], estrelas: "#fff4e8" },
      noite: { exp: 0.95, fog: "#141a30", dens: M.leve ? 0.0095 : 0.0078, sol: ["#a8bcff", 0.55], hemi: ["#30406e", "#120c16", 0.5], dir: [-10.4, 16.9, -40.4],
        bb: ["#7a88b8", "#28304e"], flor: ["#c8b8e8", "#4a4a78"], luz: 2.2, emis: 1.9, janela: [0.22, 1.7], estrelas: "#ffffff" },
    };
    // materiais com luz própria (o valor de dia fica guardado para voltar)
    const emissivos = [], janelasApagadas = [];
    scene.traverse((o) => { if (!o.isMesh && !o.isPoints) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m || m.emissiveIntensity == null || emissivos.includes(m) || janelasApagadas.includes(m)) continue;
      if (m.userData.janela === "apagada") { janelasApagadas.push(m); continue; }
      if (m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0 && m.emissiveIntensity > 0) { m.userData.ei = m.emissiveIntensity; emissivos.push(m); } } });
    const noiteEmis = new T.Color("#ffc890");
    // o céu da noite é baixado só na primeira vez que alguém escolhe a noite
    function ceuNoite() {
      if (M.ceu.noite) return Promise.resolve(M.ceu.noite);
      return new Promise((ok) => new T.TextureLoader().load("/cidade/tex/ceu-noite.jpg", (t) => { t.mapping = T.EquirectangularReflectionMapping; t.encoding = T.sRGBEncoding;
        const pm = new T.PMREMGenerator(renderer); M.ceu.noite = { fundo: t, env: pm.fromEquirectangular(t).texture }; ok(M.ceu.noite); }, undefined, () => ok(null)));
    }
    async function aplicar(nome) {
      const c = TEMAS[nome]; M.tema = nome; document.body.dataset.tema = nome;
      const ceu = nome === "noite" ? await ceuNoite() : M.ceu.entardecer;
      if (ceu) { scene.background = ceu.fundo; scene.environment = ceu.env; }
      renderer.toneMappingExposure = c.exp; scene.fog.color.set(c.fog); scene.fog.density = c.dens;
      sun.color.set(c.sol[0]); sun.intensity = c.sol[1]; if (M.sunOff) M.sunOff.set(...c.dir).setLength(45);
      if (hemi) { hemi.color.set(c.hemi[0]); hemi.groundColor.set(c.hemi[1]); hemi.intensity = c.hemi[2]; }
      if (M.bbU) { M.bbU.uSun.value.set(c.bb[0]); M.bbU.uSky.value.set(c.bb[1]); }
      if (M.florU) { M.florU.uSun.value.set(c.flor[0]); M.florU.uSky.value.set(c.flor[1]); }
      M.luzK = c.luz;
      for (const m of emissivos) m.emissiveIntensity = m.userData.ei * c.emis;
      // à noite as janelas apagadas ganham um brilho fraco (gente em casa) e as acesas brilham forte
      for (const m of janelasApagadas) { m.emissive = c.janela[0] ? noiteEmis : new T.Color(0); m.emissiveIntensity = c.janela[0]; }
      for (const m of emissivos) if (m.userData.janela === "acesa") m.emissiveIntensity = m.userData.ei * (nome === "noite" ? c.janela[1] : 1);
      if (M.estrelas) M.estrelas.material.uniforms.uCol.value.set(c.estrelas).multiplyScalar(nome === "noite" ? 1.6 : 1);
      if (M.toroLuz) M.toroLuz.userData.k = nome === "noite" ? 1.6 : 1;
      if (M.aoTema) M.aoTema();
    }
    M.aplicarTema = aplicar;

    /* o botão do canto: sol/lua */
    const css = document.createElement("style");
    css.textContent = `.tema{height:40px;min-width:40px;padding:0 13px;display:inline-flex;align-items:center;gap:8px;border-radius:999px;border:1px solid rgba(246,238,226,.45);background:rgba(20,14,18,.28);color:#f6eee2;font:13px "Noto Serif JP",Georgia,serif;cursor:pointer;backdrop-filter:blur(4px)}
      .tema svg{width:17px;height:17px}@media (max-width:520px){.tema span{display:none}}
      .veu-tema{position:fixed;inset:0;z-index:9;background:#0a0810;opacity:0;pointer-events:none;transition:opacity .35s}.veu-tema.on{opacity:1}`;
    document.head.appendChild(css);
    const veu = document.createElement("div"); veu.className = "veu-tema"; document.body.appendChild(veu);
    const btn = document.createElement("button"); btn.type = "button"; btn.className = "tema";
    const LUA = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="currentColor"/></svg>`;
    const SOL = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="4.5" fill="currentColor"/><path d="M3 18h18M5 21h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
    const rotulo = () => { const n = M.tema === "noite"; btn.innerHTML = (n ? SOL : LUA) + `<span>${n ? "Entardecer" : "Noite"}</span>`; btn.title = n ? "Voltar ao entardecer" : "Ver a vila à noite, com as luzes acesas"; };
    btn.addEventListener("click", async (e) => {
      e.stopPropagation(); const novo = M.tema === "noite" ? "entardecer" : "noite"; try { localStorage.setItem("cidade-tema", novo); } catch (er) { /* sem storage */ }
      veu.classList.add("on"); await new Promise((r) => setTimeout(r, 360)); await aplicar(novo); rotulo(); setTimeout(() => veu.classList.remove("on"), 80);
    });
    if (!M.Q.has("limpo")) (M.cantos || document.body).prepend(btn);
    let salvo = null; try { salvo = localStorage.getItem("cidade-tema"); } catch (e) { /* sem storage */ }
    const inicial = M.Q.get("tema") || salvo || "entardecer";
    await aplicar(TEMAS[inicial] ? inicial : "entardecer"); rotulo();
  });
})();
