/* A porta: o torii do topo da escadaria é o fim do Ato 1. Dentro do vão dele aparece outro céu (o anoitecer acima
   das nuvens, com luzes azuis e laranja); chegando lá, "Atravessar a porta" leva a câmera através do torii, o céu do
   outro lado toma a tela e a página do Pavilhão (Ato 2) abre já nesse céu. A página do Pavilhão começa a ser baixada
   assim que se chega à porta, para a passagem não esperar. */
(() => {
  const M = (window.MUNDO = window.MUNDO || {});
  M.builders = M.builders || [];
  M.builders.push(async (M) => {
    const { T, scene, camera, V3 } = M;
    const t0 = M.toriiPorta; if (!t0) return;
    const P = t0.position, DESTINO = "/pavilhao/";

    // o outro céu: gradiente da hora azul, nuvens embaixo, estrelas e pontos de luz azuis e laranja; a borda brilha
    const ceu = new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, fog: false, toneMapped: false,
      uniforms: { uT: M.anim ? M.anim.U.uT : { value: 0 }, uA: { value: 1 } },
      vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform float uT, uA; varying vec2 vU;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        float fbm(vec2 p){ float s = 0., a = .5; for (int k = 0; k < 5; k++) { s += a * n(p); p *= 2.03; a *= .5; } return s; }
        void main(){ vec2 u = vU; float y = u.y;
          // o outro lado: noite funda e estrelada, com uma luz dourada morna nascendo no horizonte
          vec3 c = mix(vec3(1., .86, .58), vec3(.2, .22, .5), smoothstep(.06, .46, y)); c = mix(c, vec3(.03, .05, .14), smoothstep(.34, .95, y));
          float faixa = exp(-pow((u.x - .5 + (y - .5) * .5) * 4.5, 2.)) * smoothstep(.2, .7, y) * .22; c += vec3(.55, .6, 1.) * faixa * fbm(u * vec2(8., 14.));
          float st = step(.992, h(floor(u * vec2(260., 320.)))) * smoothstep(.22, .6, y) * (.55 + .45 * sin(uT * 2.4 + u.x * 60. + u.y * 30.));
          float st2 = step(.9985, h(floor(u * vec2(90., 110.)) + 3.)) * smoothstep(.3, .7, y);
          c += st * vec3(.95, .95, 1.) + st2 * vec3(1., .95, .8) * 1.6;
          float nv = fbm(vec2(u.x * 4. + uT * .02, y * 7.)); c = mix(c, vec3(1., .9, .72), smoothstep(.5, .8, nv) * (1. - smoothstep(.02, .2, y)) * .7);
          float e = min(min(u.x, 1. - u.x), min(u.y, 1. - u.y)); float rim = 1. - smoothstep(0., .05, e);
          c += rim * vec3(1., .92, .7) * (.75 + .25 * sin(uT * 1.6));
          gl_FragColor = vec4(c, uA * (0.92 + rim * .08)); }` });
    const vao = new T.Mesh(new T.PlaneGeometry(3.7, 4.35), ceu); vao.position.set(P.x, P.y + 2.18, P.z - 0.06); vao.renderOrder = 2; scene.add(vao);
    // um pouco de luz do outro lado, no chão em volta
    if (M.luzFonte) M.luzFonte(V3(P.x, P.y + 1.6, P.z + 0.8), "#ffb27a", 1.2, 9);

    // o botão de atravessar, só quando se está na porta
    const css = document.createElement("style");
    css.textContent = `.atravessar{position:fixed;left:50%;bottom:84px;transform:translateX(-50%) translateY(8px);z-index:6;padding:13px 26px;border-radius:999px;border:1px solid rgba(255,214,170,.7);
        background:linear-gradient(135deg,rgba(181,48,27,.9),rgba(232,120,40,.9));color:#fff6ec;font:700 16px "Shippori Mincho","Noto Serif JP",Georgia,serif;letter-spacing:.04em;cursor:pointer;
        box-shadow:0 0 0 0 rgba(255,170,90,.5),0 10px 30px rgba(0,0,0,.4);opacity:0;pointer-events:none;transition:opacity .5s,transform .5s;animation:chama 2.4s ease-in-out infinite}
      .atravessar.on{opacity:1;pointer-events:auto;transform:translateX(-50%)}
      @keyframes chama{50%{box-shadow:0 0 0 10px rgba(255,170,90,0),0 10px 30px rgba(0,0,0,.4)}}
      body.dentro .atravessar,body.voando .atravessar{display:none}
      body.atravessando .nav-lugar,body.atravessando .nav-mapa,body.atravessando .cantos,body.atravessando .marcas{opacity:0!important;pointer-events:none!important;transition:opacity .5s}
      .outro-ceu{position:fixed;inset:0;z-index:30;pointer-events:none;opacity:0;transition:opacity 1.1s ease-in;
        background:linear-gradient(to top,#ffdca0 0%,#c9a46e 8%,#2a2f6a 36%,#0b1030 72%,#050816 100%)}
      .outro-ceu.on{opacity:1}`;
    document.head.appendChild(css);
    const btn = document.createElement("button"); btn.type = "button"; btn.className = "atravessar"; btn.textContent = "Atravessar a porta";
    const veu = document.createElement("div"); veu.className = "outro-ceu";
    if (!M.Q.has("limpo")) document.body.append(btn, veu);
    // o botão aparece nos certificados: dali a câmera segue direto para a porta
    const naPorta = () => M.lugares && M.lugares[M.lugarAtual()] && M.lugares[M.lugarAtual()].id === "certificados" && !(M.andando && M.andando());
    let prefetch = false;
    M.ticks.push(() => { const ok = naPorta() && !(M.noCeu && M.noCeu()) && !M.cinema; btn.classList.toggle("on", ok);
      if (ok && !prefetch) { prefetch = true; const l = document.createElement("link"); l.rel = "prefetch"; l.href = DESTINO; document.head.appendChild(l); } });

    /* atravessar: dos certificados, a câmera sobe o resto da escadaria e passa pelo vão. O céu do outro lado toma a tela
       inteira ANTES de a câmera cruzar o torii (atrás dele não há nada para ver) e a página do Pavilhão abre nesse céu. */
    let indo = false;
    function atravessar() { if (indo) return; indo = true; btn.classList.remove("on"); if (M.fechar) M.fechar(); document.body.classList.add("atravessando");
      const y = (z) => (M.yEsc ? M.yEsc(z) : P.y) + 1.6;
      const pts = [camera.position.clone(), V3(0.05, y(-100), -100), V3(0, y(-105.5), -105.5), V3(0, P.y + 1.75, -110.5), V3(P.x, P.y + 2.05, P.z + 0.6), V3(P.x, P.y + 2.1, P.z - 2)];
      const c = new T.CatmullRomCurve3(pts, false, "centripetal"), dur = 4.2 * (M.lento || 1), la = new T.Vector3(); let ti = null;
      M.cinema = (t, dt, cam) => { if (ti == null) ti = t; const u = Math.min(1, (t - ti) / dur), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        c.getPointAt(e, cam.position); c.getPointAt(Math.min(1, e + 0.05), la); la.y += 0.12; cam.lookAt(la);
        // o portal se abre: cresce para além do torii e engole o que está atrás (nada da floresta aparece)
        const k = Math.min(1, Math.max(0, (u - 0.15) / 0.55)), es = k * k * (3 - 2 * k); vao.scale.set(1 + es * 9, 1 + es * 6, 1); vao.position.y = P.y + 2.18 + es * 8;
        // o véu começa a cobrir a tela ao chegar perto e está inteiro antes de cruzar o vão
        if (cam.position.z < P.z + 6.5) veu.classList.add("on"); if (cam.position.z < P.z + 1.8) veu.style.transition = "opacity .25s"; 
        if (u >= 1 && indo !== "foi") { indo = "foi"; setTimeout(() => { location.href = DESTINO + "?de=porta"; }, 500); } };
    }
    btn.addEventListener("click", (e) => { e.stopPropagation(); atravessar(); });
    M.atravessar = atravessar;

  });
})();
