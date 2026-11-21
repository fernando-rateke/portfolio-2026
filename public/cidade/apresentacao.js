/* A música tema e o modo apresentação.
   Música: começa no primeiro toque ou clique (o navegador não deixa antes), em loop, tocando como veio; só o volume
   sobe devagar. O botão no canto liga e desliga, e a escolha fica guardada.
   Apresentação (tecla P ou o botão "Apresentar"): o computador mostra um QR; o primeiro celular que abrir /controle
   vira o controle. A conversa passa por um canal em tempo real do Supabase (chave pública, nada é gravado); sem ele,
   por BroadcastChannel (mesmo navegador). O celular move um cursor, clica, rola o painel, troca de lugar e mostra as
   anotações de cada lugar (notas.json). */
(() => {
  const M = (window.MUNDO = window.MUNDO || {});
  M.builders = M.builders || [];
  M.builders.push(async (M) => {
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const css = document.createElement("style");
    css.textContent = `
      .som{position:fixed;z-index:6;top:max(16px,env(safe-area-inset-top));right:16px;width:40px;height:40px;border-radius:50%;border:1px solid rgba(246,238,226,.45);background:rgba(20,14,18,.28);color:#f6eee2;cursor:pointer;display:grid;place-items:center;backdrop-filter:blur(4px)}
      .som svg{width:20px;height:20px}.som .x{display:inline}.som .w1,.som .w2{display:none}
      .som[aria-pressed="true"] .x{display:none}.som[aria-pressed="true"] .w1,.som[aria-pressed="true"] .w2{display:inline}
      .apr{position:fixed;z-index:6;top:max(16px,env(safe-area-inset-top));left:16px;padding:9px 14px;border-radius:999px;border:1px solid rgba(246,238,226,.35);background:rgba(20,14,18,.28);color:#f6eee2;font:13px "Noto Serif JP",Georgia,serif;cursor:pointer;opacity:.7;backdrop-filter:blur(4px)}
      .apr:hover{opacity:1}@media (pointer:coarse){.apr{display:none}}
      .qual{position:fixed;z-index:6;top:max(16px,env(safe-area-inset-top));right:66px;height:40px;padding:0 14px;display:inline-flex;align-items:center;gap:8px;border-radius:999px;border:1px solid rgba(246,238,226,.45);background:rgba(20,14,18,.28);color:#f6eee2;font:13px "Noto Serif JP",Georgia,serif;cursor:pointer;backdrop-filter:blur(4px)}
      .qual svg{width:16px;height:16px}.qual svg rect{opacity:.3}.qual[data-peso="leve"] svg rect:nth-child(1),.qual[data-peso="completo"] svg rect{opacity:1}
      @media (max-width:520px){.qual span{display:none}.qual{padding:0 12px}}
      body.apresentando .som,body.apresentando .apr,body.apresentando .qual{opacity:0;pointer-events:none}
      .veu{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 40%,rgba(30,18,24,.94),rgba(6,3,5,.98));color:#f2e8dc;font-family:"Noto Serif JP",Georgia,serif;opacity:0;pointer-events:none;transition:opacity .5s}
      .veu.on{opacity:1;pointer-events:auto}.veu-in{text-align:center;display:grid;gap:12px;justify-items:center;padding:24px}
      .veu small{font-size:12px;letter-spacing:.3em;color:#e8a070}.veu b{font-size:clamp(22px,3vw,34px);font-weight:500}
      .veu .qr{background:#f3ead6;padding:14px;border-radius:12px;line-height:0}.veu .qr img{width:min(260px,56vw);height:auto;image-rendering:pixelated}
      .veu .qr .alt{line-height:1.4;color:#2a211a;padding:18px 10px;max-width:260px;word-break:break-all;font-size:14px}
      .veu .code{margin:0;font-size:14px;opacity:.8}.veu .code span{letter-spacing:.3em;opacity:1}.veu .note{margin:0;max-width:380px;opacity:.75;font-size:14px}
      .veu button{padding:9px 16px;border-radius:999px;border:1px solid rgba(242,232,220,.4);background:none;color:inherit;font:inherit;cursor:pointer}
      .cursor{position:fixed;z-index:25;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;pointer-events:none;opacity:0;transition:opacity .4s,width .2s,height .2s,margin .2s;background:radial-gradient(circle,rgba(255,236,190,.95) 0 22%,rgba(255,190,90,.55) 36%,rgba(255,170,60,0) 70%);box-shadow:0 0 22px 6px rgba(255,180,80,.35)}
      .cursor.on{opacity:1}.cursor.hot{width:38px;height:38px;margin:-19px 0 0 -19px}
      .lanterna{position:fixed;inset:0;z-index:24;pointer-events:none;opacity:0;transition:opacity .5s;background:radial-gradient(circle 160px at var(--x,50%) var(--y,50%),rgba(0,0,0,0) 0 60%,rgba(0,0,0,.82) 100%)}
      .lanterna.on{opacity:1}
      .lightbox{position:fixed;inset:0;z-index:26;background:rgba(4,3,2,.92);display:grid;place-items:center;opacity:0;pointer-events:none;transition:opacity .4s}
      .lightbox.on{opacity:1;pointer-events:auto}.lightbox img{max-width:92vw;max-height:88vh;border-radius:8px}
      .ctl{position:fixed;z-index:6;top:calc(max(16px,env(safe-area-inset-top)) + 50px);right:16px;display:flex;gap:8px;align-items:center;padding:7px 12px;border-radius:999px;background:rgba(20,14,18,.4);color:#f6eee2;font:12px Georgia,serif}
      .ctl[hidden]{display:none}.ctl i{width:8px;height:8px;border-radius:50%;background:#5bd18a;box-shadow:0 0 8px #5bd18a}
      body.apresentando canvas{cursor:none}`;
    document.head.appendChild(css);
    const html = (s) => { const d = document.createElement("div"); d.innerHTML = s.trim(); const el = d.firstChild; document.body.appendChild(el); return el; };
    const limpo = M.Q.has("limpo");

    /* ---------- música ---------- */
    const somBtn = html(`<button class="som" type="button" aria-pressed="false" title="Ligar a música" aria-label="Música"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/><path class="w1" d="M15.5 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path class="w2" d="M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path class="x" d="M15.5 9.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>`);
    if (limpo) somBtn.style.display = "none";
    let music = null, musicWant = true, fadeT = 0;
    try { musicWant = localStorage.getItem("cidade-som") !== "0"; } catch (e) { /* sem storage */ }
    const setSomBtn = () => { const on = !!(music && !music.paused); somBtn.setAttribute("aria-pressed", String(on)); somBtn.title = on ? "Desligar a música" : "Ligar a música"; };
    const fadeTo = (v, ms, then) => { clearInterval(fadeT); const v0 = music.volume, t0 = performance.now(); fadeT = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms); music.volume = v0 + (v - v0) * k; if (k >= 1) { clearInterval(fadeT); if (then) then(); } }, 50); };
    function musicOn() {
      if (!music) { music = new Audio("/cidade/audio/tema.mp3"); music.loop = true; music.volume = 0; music.addEventListener("play", setSomBtn); music.addEventListener("pause", setSomBtn); }
      if (music.paused) music.play().then(() => fadeTo(0.5, 3000)).catch(() => {});
    }
    const musicOff = () => { if (music && !music.paused) fadeTo(0, 700, () => music.pause()); };
    function toggleMusic() { musicWant = !(music && !music.paused); try { localStorage.setItem("cidade-som", musicWant ? "1" : "0"); } catch (e) { /* sem storage */ } if (musicWant) musicOn(); else musicOff(); }
    somBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleMusic(); });
    const primeiro = () => { removeEventListener("pointerdown", primeiro); removeEventListener("keydown", primeiro); if (musicWant) musicOn(); };
    addEventListener("pointerdown", primeiro); addEventListener("keydown", primeiro);

    /* ---------- Leve ou Completo: trocar recarrega a página no mesmo lugar do passeio ---------- */
    const pesoBtn = html(`<button class="qual" type="button"><svg viewBox="0 0 18 18" fill="currentColor" aria-hidden="true"><rect x="2" y="11" width="3.4" height="5" rx="1"/><rect x="7.3" y="7" width="3.4" height="9" rx="1"/><rect x="12.6" y="3" width="3.4" height="13" rx="1"/></svg><span></span></button>`);
    if (limpo) pesoBtn.style.display = "none";
    pesoBtn.dataset.peso = M.peso; pesoBtn.querySelector("span").textContent = M.leve ? "Leve" : "Completo";
    pesoBtn.title = M.leve ? "Modo Leve. Trocar para o Completo (sombras, reflexo no lago e mais detalhes)" : "Modo Completo. Trocar para o Leve (para celular e computador simples)";
    pesoBtn.addEventListener("click", (e) => {
      e.stopPropagation(); const novo = M.leve ? "completo" : "leve"; try { localStorage.setItem("cidade-peso", novo); } catch (er) { /* sem storage */ }
      const u = new URL(location.href); u.searchParams.delete("leve"); u.searchParams.delete("completo"); u.searchParams.set("s", String(M.lugarAtual())); if (!localStorageOk()) u.searchParams.set(novo, "1"); location.href = u.toString();
    });
    function localStorageOk() { try { localStorage.setItem("cidade-t", "1"); localStorage.removeItem("cidade-t"); return true; } catch (e) { return false; } }

    /* ---------- modo apresentação ---------- */
    const aprBtn = html(`<button class="apr" type="button" title="Controlar pelo celular (tecla P)">Apresentar</button>`); if (limpo) aprBtn.style.display = "none";
    const veu = html(`<div class="veu" role="dialog" aria-hidden="true" aria-labelledby="veuT"><div class="veu-in"><small>MODO APRESENTAÇÃO</small><b id="veuT">Escaneie com o celular</b><div class="qr"></div><p class="code">código <span>------</span></p><p class="note">O primeiro celular que entrar vira o controle. Os outros não conseguem mexer em nada.</p><button type="button">Fechar</button></div></div>`);
    const cursorEl = html(`<div class="cursor" aria-hidden="true"></div>`), spot = html(`<div class="lanterna" aria-hidden="true"></div>`);
    const light = html(`<div class="lightbox" aria-hidden="true"><img alt=""></div>`), chip = html(`<div class="ctl" aria-live="polite" hidden><i></i><span>Controle conectado</span></div>`);
    light.addEventListener("click", () => light.classList.remove("on"));
    const qrBox = veu.querySelector(".qr"), codeEl = veu.querySelector(".code span"), canvas = M.renderer.domElement;
    let code = null, phone = null, ch = null, bc = null, lastSeen = 0, lastState = "";
    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const loadScript = (src) => new Promise((res, rej) => { const el = document.createElement("script"); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); });
    const send = (m) => { m.code = code; try { if (ch) ch.send({ type: "broadcast", event: "m", payload: m }); if (bc) bc.postMessage(m); } catch (e) { /* sem canal */ } };
    async function connect() {
      if (ch || bc) return;
      let cfg = null; try { const r = await fetch("/api/config", { cache: "no-store" }); if (r.ok) cfg = await r.json(); } catch (e) { /* sem rota */ }
      if (cfg && cfg.ok) {
        try {
          if (!window.supabase) await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js");
          const sb = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: false } });
          ch = sb.channel("controle-" + code, { config: { broadcast: { self: false } } });
          ch.on("broadcast", { event: "m" }, ({ payload }) => onMsg(payload)).subscribe();
        } catch (e) { ch = null; }
      }
      if (!ch && "BroadcastChannel" in window) { bc = new BroadcastChannel("controle-" + code); bc.onmessage = (e) => onMsg(e.data); }
    }
    async function open() {
      if (!code) code = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
      codeEl.textContent = code; veu.classList.add("on"); veu.setAttribute("aria-hidden", "false");
      const url = location.origin + "/controle#" + code;
      try { if (!window.qrcode) await loadScript("/cidade/vendor/qrcode.min.js"); const q = window.qrcode(0, "M"); q.addData(url); q.make(); qrBox.innerHTML = q.createImgTag(6, 0, "QR code do controle"); }
      catch (e) { qrBox.innerHTML = `<div class="alt">Sem QR agora. No celular, abra<br><b>${esc(location.host)}/controle</b><br>e digite o código abaixo.</div>`; }
      await connect();
    }
    const close = () => { veu.classList.remove("on"); veu.setAttribute("aria-hidden", "true"); };
    function paired() { close(); document.body.classList.add("apresentando"); cursorEl.classList.add("on"); chip.hidden = false; moveTo(innerWidth / 2, innerHeight / 2); lastState = ""; sendState(); }
    function unpair() { phone = null; document.body.classList.remove("apresentando"); cursorEl.classList.remove("on"); spot.classList.remove("on"); chip.hidden = true; }
    function moveTo(x, y) {
      pos.x = Math.max(0, Math.min(innerWidth - 1, x)); pos.y = Math.max(0, Math.min(innerHeight - 1, y));
      cursorEl.style.transform = `translate(${pos.x}px, ${pos.y}px)`; spot.style.setProperty("--x", pos.x + "px"); spot.style.setProperty("--y", pos.y + "px");
      const el = document.elementFromPoint(pos.x, pos.y);
      const hot = el === canvas ? !!M.pick(pos.x, pos.y) : !!(el && el.closest && el.closest("button, a, input, textarea"));
      cursorEl.classList.toggle("hot", hot);
    }
    function clickHere() {
      if (light.classList.contains("on")) { light.classList.remove("on"); return; }
      const el = document.elementFromPoint(pos.x, pos.y);
      if (!el || el === canvas) { M.clicar(pos.x, pos.y); return; }
      const t = el.closest("button, a, input, textarea") || el;
      if (/INPUT|TEXTAREA/.test(t.tagName)) t.focus(); else t.click();
    }
    const painel = () => document.querySelector(".pp.on .bd");
    function zoom(on) { const img = painel() && painel().querySelector("img"); if (on && img) { light.querySelector("img").src = img.src; light.classList.add("on"); } else light.classList.remove("on"); }
    function sendState() {
      if (!phone) return;
      const k = M.lugarAtual(), lugar = M.lugares[k], sec = M.painelAberto();
      const st = { t: "state", phone, fin: "", place: k, id: sec || lugar.id, title: lugar.nome, sub: lugar.jp, g: lugar.g, back: k > 0, panel: !!sec, music: !!(music && !music.paused),
        places: M.lugares.map((p) => ({ i: p.i, id: p.id, t: p.nome, g: p.g, sub: p.jp })) };
      const js = JSON.stringify(st); if (js === lastState) return; lastState = js; send(st);
    }
    setInterval(() => { if (phone) { sendState(); chip.querySelector("span").textContent = performance.now() - lastSeen > 20000 ? "Controle sem sinal" : "Controle conectado"; } }, 400);
    setInterval(() => { if (phone) { lastState = ""; sendState(); } }, 5000); // reenvia de vez em quando, caso algo se perca
    function onMsg(m) {
      if (!m || m.code !== code) return;
      if (m.t === "hello") {
        if (!phone || phone === m.phone || performance.now() - lastSeen > 20000) { phone = m.phone; lastSeen = performance.now(); paired(); send({ t: "paired", phone }); }
        else send({ t: "busy", phone: m.phone });
        return;
      }
      if (m.phone !== phone) return; lastSeen = performance.now();
      switch (m.t) {
        case "move": moveTo(pos.x + m.dx * innerWidth, pos.y + m.dy * innerWidth); break;
        case "click": clickHere(); break;
        case "look": M.olhar(m.dx * 0.009, m.dy * 0.0085); break;
        case "scroll": if (painel()) painel().scrollBy(0, m.dy); else M.olhar(0, m.dy * 0.004); break;
        case "back": M.anterior(); break;
        case "go": M.irPara(m.i); break;
        case "home": case "fim": M.irPara(0); break;
        case "close": M.fechar(); light.classList.remove("on"); break;
        case "zoom": zoom(!!m.on); break;
        case "spot": spot.classList.toggle("on", !!m.on); break;
        case "music": toggleMusic(); break;
        case "bye": unpair(); break;
      }
      sendState();
    }
    aprBtn.addEventListener("click", open); veu.querySelector("button").addEventListener("click", close);
    addEventListener("keydown", (e) => { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; if (e.key.toLowerCase() === "p") { if (veu.classList.contains("on")) close(); else open(); } else if (e.key === "Escape" && veu.classList.contains("on")) close(); });
  });
})();
