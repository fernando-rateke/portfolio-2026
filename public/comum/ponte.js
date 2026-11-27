/* A ponte com o controle pelo celular nas páginas do Ato 2 (Pavilhão) e do Ato 3 (cidade neon).
   O celular é pareado na cidade (botão Apresentar); o par fica guardado nesta aba (sessionStorage "controle-par") e
   aqui a página só reconecta no mesmo canal e conversa do mesmo jeito: manda o estado (onde está, o que dá para fazer
   agora, em botões com nome) e recebe as ações. Sem cursor.
   Uso: Ponte.iniciar({ estado: () => ({ id, title, sub, g, panel, acoes: [{ id, t, sub }] }), fazer(id), rolar(dy), fechar() }) */
(() => {
  let par = null; try { par = JSON.parse(sessionStorage.getItem("controle-par") || "null"); } catch (e) { par = null; }
  const loadScript = (src) => new Promise((res, rej) => { const el = document.createElement("script"); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); });
  window.Ponte = {
    pareado: () => !!(par && par.code && par.phone),
    async iniciar(o) {
      if (!par || !par.code || !par.phone) return;
      const { code, phone } = par; let ch = null, bc = null, ultimo = "";
      const send = (m) => { m.code = code; try { if (ch) ch.send({ type: "broadcast", event: "m", payload: m }); if (bc) bc.postMessage(m); } catch (e) { /* sem canal */ } };
      const onMsg = (m) => {
        if (!m || m.code !== code) return;
        if (m.t === "hello") { if (m.phone === phone) { send({ t: "paired", phone }); ultimo = ""; } else send({ t: "busy", phone: m.phone }); return; }
        if (m.phone !== phone) return;
        if (m.t === "acao") { if (m.id === "fechar") o.fechar && o.fechar(); else o.fazer && o.fazer(String(m.id || "")); }
        else if (m.t === "close") o.fechar && o.fechar();
        else if (m.t === "scroll") o.rolar && o.rolar(m.dy || 0);
        ultimo = ""; estado();
      };
      let cfg = null; try { const r = await fetch("/api/config", { cache: "no-store" }); if (r.ok) cfg = await r.json(); } catch (e) { /* sem rota */ }
      if (cfg && cfg.ok) { try {
        if (!window.supabase) await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js");
        const sb = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: false } });
        ch = sb.channel("controle-" + code, { config: { broadcast: { self: false } } }); ch.on("broadcast", { event: "m" }, ({ payload }) => onMsg(payload)).subscribe((s) => { if (s === "SUBSCRIBED") send({ t: "paired", phone }); });
      } catch (e) { ch = null; } }
      if (!ch && "BroadcastChannel" in window) { bc = new BroadcastChannel("controle-" + code); bc.onmessage = (e) => onMsg(e.data); send({ t: "paired", phone }); }
      function estado() { const e = o.estado ? o.estado() : {};
        const st = { t: "state", phone, fin: "", place: 0, id: e.id || "", title: e.title || "", sub: e.sub || "", g: e.g || "", back: false, panel: !!e.panel, music: false, places: [],
          acoes: (e.panel ? [{ id: "fechar", t: "Fechar" }] : []).concat(e.acoes || []) };
        const js = JSON.stringify(st); if (js === ultimo) return; ultimo = js; send(st); }
      setInterval(estado, 400); setInterval(() => { ultimo = ""; estado(); }, 5000); estado();
      // um aviso discreto de que o celular está conectado
      const chip = document.createElement("div"); chip.setAttribute("aria-live", "polite");
      chip.style.cssText = "position:fixed;z-index:40;left:50%;top:14px;transform:translateX(-50%);padding:6px 14px;border-radius:999px;background:rgba(10,14,30,.55);color:#e8eeff;font:12px system-ui,sans-serif;letter-spacing:.06em;backdrop-filter:blur(6px);pointer-events:none;transition:opacity 1s";
      chip.textContent = "Controle conectado"; document.body.appendChild(chip); setTimeout(() => (chip.style.opacity = "0"), 3500);
    },
  };
})();
