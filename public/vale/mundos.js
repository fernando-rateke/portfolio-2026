/* Mundos de destaque: Templo do Sino (AcousticBuild) e Nós.
   Cada mundo abre em tela cheia, com cena 3D própria, e termina num dossiê. */
(() => {
  "use strict";
  const T = window.THREE;
  if (!T) return;
  const $ = (id) => document.getElementById(id);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;

  /* ---------------- utilitários ---------------- */
  function mulberry(a) {
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const M = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(sx, sy, sz));

  function Builder() {
    const P = [], N = [], C = [], G = [];
    const nm = new T.Matrix3(), v = new T.Vector3(), tmp = new T.Color();
    return {
      add(geo, m, color, glow = 0) {
        const g = geo.index ? geo.toNonIndexed() : geo;
        if (!g.attributes.normal) g.computeVertexNormals();
        const p = g.attributes.position, n = g.attributes.normal;
        const fixed = typeof color === "function" ? null : new T.Color(color);
        nm.getNormalMatrix(m);
        for (let i = 0; i < p.count; i++) {
          let c = fixed;
          if (!c) {
            const t0 = i - (i % 3);
            c = tmp.set(color((p.getX(t0) + p.getX(t0 + 1) + p.getX(t0 + 2)) / 3, (p.getY(t0) + p.getY(t0 + 1) + p.getY(t0 + 2)) / 3, (p.getZ(t0) + p.getZ(t0 + 1) + p.getZ(t0 + 2)) / 3));
          }
          v.fromBufferAttribute(p, i).applyMatrix4(m); P.push(v.x, v.y, v.z);
          v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); N.push(v.x, v.y, v.z);
          C.push(c.r, c.g, c.b); G.push(glow);
        }
        return this;
      },
      build() {
        const g = new T.BufferGeometry();
        g.setAttribute("position", new T.Float32BufferAttribute(P, 3));
        g.setAttribute("normal", new T.Float32BufferAttribute(N, 3));
        g.setAttribute("color", new T.Float32BufferAttribute(C, 3));
        g.setAttribute("aGlow", new T.Float32BufferAttribute(G, 1));
        return g;
      },
    };
  }

  const NOISE = `
    vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
    float snoise(vec2 v){
      const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
      vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);
      vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
      vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod289(i);
      vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
      vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0); m=m*m; m=m*m;
      vec3 x=2.0*fract(p*C.www)-1.0; vec3 h=abs(x)-0.5; vec3 ox=floor(x+0.5); vec3 a0=x-ox;
      m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
      vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw; return 130.0*dot(m,g);
    }`;

  // Material em faixas (cel shading) com luz principal, três luzes pontuais, brilho próprio e névoa
  function toon(env, extra = {}) {
    return new T.ShaderMaterial({
      uniforms: Object.assign({}, env, { uHit: { value: 0 }, uHitCol: { value: new T.Color(1, 0.8, 0.45) } }, extra),
      vertexShader: `attribute vec3 color; attribute float aGlow; varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vG;
        void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); vC=color; vG=aGlow; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform vec3 uSun, uSunCol, uAmb, uFog; uniform float uFogDen; uniform vec3 uPL[3]; uniform vec3 uPLC[3]; uniform float uPLR[3];
        uniform float uGlow; uniform vec3 uGlowCol; uniform float uHit; uniform vec3 uHitCol;
        varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vG;
        void main(){
          vec3 n=normalize(vN); float ndl=dot(n,uSun);
          float band=smoothstep(-0.06,0.06,ndl)*0.55+smoothstep(0.42,0.52,ndl)*0.45;
          vec3 c=vC*(uAmb+uSunCol*band);
          for(int i=0;i<3;i++){
            vec3 L=uPL[i]-vW; float d=length(L); float a=max(dot(n,L/max(d,0.001)),0.0)*0.7+0.3;
            float f=1.0/(1.0+d*d/(uPLR[i]*uPLR[i]));
            c+=vC*uPLC[i]*smoothstep(0.02,0.2,a*f)*f*1.4;
          }
          vec3 V=normalize(cameraPosition-vW);
          c+=vC*0.1*smoothstep(0.6,1.0,1.0-max(dot(n,V),0.0));
          c=mix(c,uGlowCol*vC*1.6+uGlowCol*0.25,vG*uGlow);
          c+=uHitCol*uHit*0.55;
          float d=length(vW-cameraPosition); c=mix(c,uFog,1.0-exp(-d*uFogDen));
          gl_FragColor=vec4(c,1.0);
        }`,
    });
  }
  function outline(width, color, env) {
    return new T.ShaderMaterial({
      uniforms: { uWidth: { value: width }, uLine: { value: new T.Color(color) }, uFog: env.uFog, uFogDen: env.uFogDen },
      side: T.BackSide,
      vertexShader: `uniform float uWidth; varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position+normal*uWidth,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform vec3 uLine, uFog; uniform float uFogDen; varying vec3 vW; void main(){ float d=length(vW-cameraPosition); gl_FragColor=vec4(mix(uLine,uFog,1.0-exp(-d*uFogDen)),1.0); }`,
    });
  }
  function envUniforms(o) {
    return {
      uSun: { value: new T.Vector3(...o.sun).normalize() }, uSunCol: { value: new T.Color(o.sunCol) }, uAmb: { value: new T.Color(o.amb) },
      uFog: { value: new T.Color(o.fog) }, uFogDen: { value: o.fogDen },
      uPL: { value: [new T.Vector3(), new T.Vector3(), new T.Vector3()] }, uPLC: { value: [new T.Color(0), new T.Color(0), new T.Color(0)] }, uPLR: { value: [1, 1, 1] },
      uGlow: { value: 1 }, uGlowCol: { value: new T.Color(o.glowCol || "#FFC67A") },
    };
  }

  /* ---------------- Calcifer: chama em shader, com rosto ---------------- */
  function makeCalcifer(s = 1) {
    const group = new T.Group();
    const U = { uT: { value: 0 }, uTalk: { value: 0 }, uBlink: { value: 1 }, uLook: { value: new T.Vector2() }, uHot: { value: 0 }, uArms: { value: 0 } };
    const flame = new T.Mesh(new T.PlaneGeometry(1.3 * s, 1.6 * s), new T.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: U,
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `${NOISE}
        uniform float uT, uTalk, uBlink, uHot, uArms; uniform vec2 uLook; varying vec2 vUv;
        float fbm2(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*snoise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
        void main(){
          float t=uT;
          vec2 q=vec2((vUv.x-0.5)*0.8125, vUv.y);
          // proporções do filme: corpo largo e baixo, línguas de fogo subindo do topo
          vec2 c=vec2(0.0,0.33);
          vec2 v=q-c;
          v.x+=0.03*snoise(vec2(v.y*5.0-t*2.4,t*0.5))*smoothstep(0.0,0.35,v.y);
          float ang=atan(v.y,v.x);
          float dist=length(v*vec2(0.96,1.04));
          float up=smoothstep(0.15,1.0,sin(ang));
          float lick=snoise(vec2(ang*2.4,t*1.6-dist*6.0))*0.7+snoise(vec2(ang*5.0,t*2.4-dist*9.0))*0.25;
          float r=0.245+0.012*snoise(vec2(ang*2.0,t*0.6))+up*(0.07+0.13*max(lick+0.25,0.0));
          float f=r-dist;
          float body=smoothstep(-0.012,0.022,f);
          float aura=smoothstep(-0.12,0.01,f);
          // brasas que se soltam
          float wisp=0.0;
          for(int i=0;i<3;i++){
            float fi=float(i); float ph=fract(t*0.35+fi*0.33);
            vec2 wp=c+vec2(sin(fi*2.1+t*0.7)*0.08, 0.3+ph*0.36);
            wisp=max(wisp, smoothstep(0.03*(1.0-ph)+0.006,0.0,length((q-wp)*vec2(1.2,0.8)))*(1.0-ph));
          }
          // braços de fogo
          float arms=0.0;
          for(int k=0;k<2;k++){
            float sx=k==0?-1.0:1.0;
            vec2 p=q-vec2(sx*0.2,0.22);
            float along=sx*p.x; float len=0.17*uArms;
            float wav=0.016*sin(along*30.0-t*11.0+sx);
            float th=mix(0.036,0.01,clamp(along/max(len,0.001),0.0,1.0));
            arms=max(arms, smoothstep(th+0.008,th-0.006,abs(p.y-wav-0.05*along))*step(0.0,along)*smoothstep(len,len-0.035,along));
          }
          // cor: núcleo âmbar, laranja, borda vermelha; textura de pincel bem leve
          float heat=clamp(f/0.2,0.0,1.0);
          vec3 col=mix(vec3(0.80,0.24,0.08),vec3(0.94,0.50,0.16),smoothstep(0.0,0.35,heat));
          col=mix(col,vec3(0.98,0.66,0.26),smoothstep(0.35,0.85,heat));
          col=mix(col,vec3(1.0,0.82,0.46),smoothstep(0.8,1.0,heat)*0.6*(1.0-up));
          col*=0.95+0.07*fbm2(q*5.0+vec2(0.0,-t*0.8));
          col*=1.0+uHot*0.12;
          vec3 outc=mix(vec3(0.55,0.1,0.04),col,body);
          outc=mix(outc,vec3(0.96,0.56,0.2),wisp*(1.0-body));
          outc=mix(outc,vec3(1.0,0.82,0.4),arms*(1.0-body));
          float a=max(max(aura*0.55,body),max(wisp*0.9,arms));
          // rosto do filme: olhos pequenos e afastados, bem redondos, no meio do corpo
          float bl=max(uBlink,0.08);
          for(int e=0;e<2;e++){
            float sx=e==0?-1.0:1.0;
            vec2 ec=vec2(sx*0.098,0.322);
            float ed=length((q-ec)/vec2(0.04,0.042*bl));
            outc=mix(outc,vec3(0.24,0.09,0.03),smoothstep(1.2,1.1,ed)*body);
            outc=mix(outc,vec3(0.95,0.91,0.82),smoothstep(1.03,0.97,ed)*body);
            vec2 pc=ec+uLook*vec2(0.012,0.01*bl);
            outc=mix(outc,vec3(0.16,0.07,0.03),smoothstep(0.0125,0.009,length((q-pc)/vec2(1.0,bl)))*step(ed,1.0)*body);
          }
          // boca: pílula pequena; ao falar, abre num D largo
          vec2 mc=vec2(0.0,0.245);
          float open=smoothstep(0.08,0.4,uTalk);
          vec2 mp=q-mc;
          float pill=length(vec2(max(abs(mp.x)-0.026,0.0),mp.y))-0.008;
          float dh=0.01+0.05*uTalk;
          float dshape=max(length(vec2(mp.x/0.085,(mp.y+0.002)/dh))-1.0, mp.y-0.006);
          float m=mix(pill*34.0,dshape,open);
          float inside=smoothstep(0.03,-0.03,m);
          vec3 mouthCol=mix(vec3(0.9,0.36,0.16),mix(vec3(0.4,0.06,0.02),vec3(0.96,0.64,0.26),smoothstep(-0.006-dh*0.45,-0.006-dh*0.9,mp.y)),open);
          outc=mix(outc,vec3(0.25,0.08,0.03),smoothstep(0.32,0.0,abs(m))*body*0.85);
          outc=mix(outc,mouthCol,inside*body);
          gl_FragColor=vec4(outc,a);
          if(a<0.01) discard;
        }`,
    }));
    flame.position.y = 0.8 * s;
    const halo = new T.Mesh(new T.PlaneGeometry(3.2 * s, 3.2 * s), new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: U,
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float uT, uHot; varying vec2 vUv; void main(){ float d=length(vUv-vec2(0.5,0.42)); float f=0.85+0.1*sin(uT*9.0)+0.05*sin(uT*23.0); float a=smoothstep(0.5,0.0,d)*0.3*f*(1.0+uHot*0.5); gl_FragColor=vec4(vec3(1.0,0.45,0.12)*a,a); }`,
    }));
    halo.position.y = 0.7 * s;
    group.add(halo, flame);
    let blinkT = 2;
    return {
      group, U,
      update(dt, camera, talk) {
        U.uT.value += dt;
        U.uTalk.value += ((talk ? 0.45 + 0.55 * Math.abs(Math.sin(U.uT.value * 9)) : 0) - U.uTalk.value) * Math.min(1, dt * 12);
        U.uArms.value += (Math.max(talk ? 1 : 0, U.uHot.value) - U.uArms.value) * Math.min(1, dt * 4);
        blinkT -= dt;
        if (blinkT < 0) { U.uBlink.value = Math.max(0, U.uBlink.value - dt * 14); if (U.uBlink.value === 0) blinkT = 2.5 + Math.random() * 3; }
        else U.uBlink.value = Math.min(1, U.uBlink.value + dt * 10);
        // os olhos seguem o cursor
        U.uLook.value.x += (pointer.sx - U.uLook.value.x) * Math.min(1, dt * 4);
        U.uLook.value.y += (-pointer.sy - U.uLook.value.y) * Math.min(1, dt * 4);
        flame.quaternion.copy(camera.quaternion); halo.quaternion.copy(camera.quaternion);
      },
    };
  }

  /* ---------------- estrutura comum ---------------- */
  const root = document.documentElement;
  const el = $("world"), canvas = $("worldCanvas");
  if (!el || !canvas) return;
  let renderer = null, current = null, running = false, last = 0, W = 1, H = 1;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  function ensureRenderer() {
    if (renderer) return true;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); }
    catch (e) { return false; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5));
    return true;
  }
  function resize() {
    if (!renderer) return;
    W = Math.max(1, canvas.clientWidth); H = Math.max(1, canvas.clientHeight);
    renderer.setSize(W, H, false);
    if (current) current.resize(W, H);
  }
  function loop(now) {
    if (!running || !current) return;
    // no máximo 60 quadros por segundo; com os cartões abertos, bem menos
    const minGap = !kami.hidden && kami.classList.contains("open") ? 1000 / 24 : 1000 / 60 - 1.5;
    if (now - last < minGap) { requestAnimationFrame(loop); return; }
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 1.8);
    pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 1.8);
    current.update(dt);
    current.render(renderer);
    requestAnimationFrame(loop);
  }
  function setRunning(on) {
    if (on && !running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    if (!on) running = false;
  }
  el.addEventListener("pointermove", (e) => { pointer.x = e.clientX / innerWidth * 2 - 1; pointer.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  addEventListener("resize", () => { if (current) resize(); });

  const dossier = $("dossier"), dossierBtn = $("worldDossierBtn"), hint = $("worldHint"), title = $("worldTitle"), labels = $("worldLabels"), line = $("worldLine");
  // Kamishibai: cada <section class="kc"> do conteúdo vira um cartão pintado
  const kami = $("kami"), kWin = $("kamiWindow"), kDots = $("kamiDots"), kCount = $("kamiCount");
  let kCards = [], kIdx = 0, kTimer = null;
  function buildCards() {
    const body = $("dossierBody");
    if (!body.firstElementChild) return;
    let secs = [...body.children].filter((n) => n.matches("section.kc"));
    if (!secs.length) { const sec = document.createElement("section"); sec.className = "kc"; while (body.firstChild) sec.appendChild(body.firstChild); body.appendChild(sec); secs = [sec]; }
    kCards.forEach((c) => c.remove());
    kCards = secs.map((sec) => {
      const card = document.createElement("article"); card.className = "kami-card"; sec.classList.forEach((c) => { if (c !== "kc") card.classList.add(c); });
      card.dataset.c = sec.dataset.c || (current && current.kamiColor) || "gold";
      if (sec.dataset.k) { const k = document.createElement("span"); k.className = "kk"; k.setAttribute("aria-hidden", "true"); k.textContent = sec.dataset.k; card.appendChild(k); }
      const inner = document.createElement("div"); inner.className = "kc-body";
      while (sec.firstChild) inner.appendChild(sec.firstChild);
      card.appendChild(inner);
      kWin.insertBefore(card, kWin.firstChild);
      return card;
    });
    body.innerHTML = "";
    kIdx = Math.max(0, Math.min(kCards.length - 1, parseInt(body.dataset.start || "0", 10) || 0));
    delete body.dataset.start;
    kDots.innerHTML = kCards.length > 1 && kCards.length <= 16 ? kCards.map(() => "<i></i>").join("") : "";
  }
  function setCard(i) {
    kIdx = Math.max(0, Math.min(kCards.length - 1, i));
    kCards.forEach((c, j) => {
      c.classList.toggle("out", j < kIdx);
      c.style.zIndex = j < kIdx ? 3 : j === kIdx ? 2 : j === kIdx + 1 ? 1 : 0;
      c.style.visibility = j < kIdx - 1 || j > kIdx + 1 ? "hidden" : "visible";
      c.setAttribute("aria-hidden", String(j !== kIdx));
      if (j === kIdx) c.querySelector(".kc-body").scrollTop = 0;
    });
    [...kDots.children].forEach((d, j) => d.classList.toggle("on", j === kIdx));
    kCount.textContent = kCards.length > 1 ? `${kIdx + 1} / ${kCards.length}` : "";
    $("kamiPrev").disabled = kIdx === 0; $("kamiNext").disabled = kIdx === kCards.length - 1;
    $("kamiPrev").hidden = $("kamiNext").hidden = kCards.length < 2;
    if (current && current.onCard) current.onCard(kIdx);
  }
  function showDossier() {
    buildCards();
    if (!kCards.length) return;
    clearTimeout(kTimer);
    kami.hidden = false; dossierBtn.hidden = true;
    setCard(kIdx);
    requestAnimationFrame(() => requestAnimationFrame(() => kami.classList.add("open")));
    $("kamiClose").focus();
  }
  function hideDossier() { kami.classList.remove("open"); clearTimeout(kTimer); kTimer = setTimeout(() => { if (!kami.classList.contains("open")) kami.hidden = true; }, 360); }
  const kamiOpen = () => !kami.hidden && kami.classList.contains("open");
  function closeKami() {
    hideDossier();
    if (current && current.onDossierClose) current.onDossierClose();
    if (current && current.dossierReady) dossierBtn.hidden = false;
  }
  dossierBtn.addEventListener("click", showDossier);
  $("kamiClose").addEventListener("click", closeKami);
  $("dossierClose").addEventListener("click", closeKami);
  kWin.addEventListener("click", (e) => { const g = e.target.closest("[data-goto]"); if (g) setCard(+g.dataset.goto); });
  $("kamiPrev").addEventListener("click", () => setCard(kIdx - 1));
  $("kamiNext").addEventListener("click", () => setCard(kIdx + 1));
  kami.addEventListener("click", (e) => { if (e.target === kami) closeKami(); });
  addEventListener("keydown", (e) => { if (!kamiOpen()) return; if (e.key === "ArrowRight") setCard(kIdx + 1); else if (e.key === "ArrowLeft") setCard(kIdx - 1); });
  { let sx = null; kWin.addEventListener("pointerdown", (e) => { sx = e.clientX; }); kWin.addEventListener("pointerup", (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 50) setCard(kIdx + (e.clientX < sx ? 1 : -1)); sx = null; }); }

  const backBtn = $("worldBack"), backHTML = backBtn.innerHTML;
  function open(name, from) {
    const w = worlds[name];
    if (!w) return;
    w.from = from || null;
    backBtn.innerHTML = w.from ? backHTML.replace("Voltar ao vale", name === "quarto" ? "Descer ao castelo" : "Voltar ao castelo") : backHTML;
    if (!ensureRenderer()) return;
    current = w;
    el.hidden = false; el.dataset.world = name; root.classList.add("intro-on");
    window.dispatchEvent(new CustomEvent("mundo", { detail: "open" }));
    $("dossierBody").innerHTML = $(w.template) ? $(w.template).innerHTML : "";
    hideDossier(); dossierBtn.hidden = true; dossierBtn.textContent = w.dossierLabel;
    labels.innerHTML = ""; line.textContent = ""; line.classList.remove("show");
    title.innerHTML = w.titleHTML; hint.textContent = w.hintText;
    if (!w.built) { w.build(); w.built = true; }
    w.start();
    resize();
    setRunning(true);
    $("worldBack").focus();
  }
  function close() {
    if (!current) return;
    current.stop();
    setRunning(false);
    current = null;
    el.hidden = true; root.classList.remove("intro-on");
    hideDossier();
    window.dispatchEvent(new CustomEvent("mundo", { detail: "close" }));
  }
  function back() { if (!current) return; const f = current.from, was = el.dataset.world; close(); if (f) { worlds[f].returnFrom = was; open(f); } }
  backBtn.addEventListener("click", back);
  addEventListener("keydown", (e) => { if (e.key !== "Escape" || !current) return; if (kamiOpen()) { closeKami(); return; } back(); });

  // aviso antes da porta preta
  const gate = $("worldGate");
  let gateFrom = null;
  function showGate(from) { gateFrom = from || null; gate.hidden = false; root.classList.add("intro-on"); $("gateEnter").focus(); }
  $("gateEnter").addEventListener("click", () => { gate.hidden = true; worlds.nos.entered = true; open("nos", gateFrom); });
  $("gateBack").addEventListener("click", () => { gate.hidden = true; if (gateFrom && !current) { open(gateFrom); return; } if (!current) root.classList.remove("intro-on"); });

  /* =================================================================== */
  /* NÓS                                                                  */
  /* =================================================================== */
  const nos = (() => {
    const scene = new T.Scene();
    scene.background = new T.Color("#0A0706");
    const camera = new T.PerspectiveCamera(56, 1, 0.05, 120);
    const env = envUniforms({ sun: [0.2, 0.9, 0.3], sunCol: "#3A3028", amb: "#2A2018", fog: "#0A0706", fogDen: 0.06, glowCol: "#FFC27A" });
    const LINES = ["A casa conhece você.", "Até o que você esconde.", "E sabe onde procurar.", "Volta… por favor."];
    const START = 3.5, END = -50, KNOT = new T.Vector3(Math.sin(-55.5 * 0.08) * 0.6, 1.55, -55.5);
    let time = 0, walk = START, holding = false, wheel = 0, said = 0, arrived = false, found = 0, flash = 0, knot, knotMat, halo, thread, audio = null, drone = null, stepAcc = 0, timer = null, titleEl = null;
    const rt = new T.WebGLRenderTarget(320, 180, { minFilter: T.NearestFilter, magFilter: T.NearestFilter });
    const post = new T.Scene(), postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postMat = new T.ShaderMaterial({
      uniforms: { tDiffuse: { value: rt.texture }, uRes: { value: new T.Vector2(320, 180) }, uTime: { value: 0 }, uFlash: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uTime, uFlash; varying vec2 vUv;
        float b2(vec2 p){ return p.x*2.0+p.y*3.0-p.x*p.y*4.0; }
        float bayer4(vec2 p){ p=mod(p,4.0); return b2(mod(p,2.0))*4.0+b2(floor(p/2.0)); }
        void main(){
          vec2 px=floor(vUv*uRes);
          vec3 c=texture2D(tDiffuse,(px+0.5)/uRes).rgb;
          float b=(bayer4(px)+0.5)/16.0-0.5;
          c=floor(c*16.0+b*0.55+0.5)/16.0;
          vec2 q=vUv-0.5; c*=1.0-dot(q,q)*1.6;
          c+=(fract(sin(dot(px+floor(uTime*12.0),vec2(12.9898,78.233)))*43758.5453)-0.5)*0.014;
          c=mix(c,vec3(1.0,0.86,0.55),uFlash);
          gl_FragColor=vec4(c,1.0);
        }`,
    });
    post.add(new T.Mesh(new T.PlaneGeometry(2, 2), postMat));
    const audioEl = null;

    function build() {
      const mat = toon(env);
      const B = Builder(); const r = mulberry(31);
      const W2 = 1.6, HH = 3.2; void W2; void HH;
      // a caverna: um tubo de rocha irregular, chão de terra e musgo, estalactites
      const RAD = 2.7, LEN = 70, Z0 = -27;
      const tube = new T.CylinderGeometry(RAD, RAD, LEN, 40, 140, true);
      tube.rotateX(Math.PI / 2);
      {
        const p = tube.attributes.position;
        for (let i = 0; i < p.count; i++) {
          let x = p.getX(i), y = p.getY(i); const z = p.getZ(i) + Z0;
          const a = Math.atan2(y, x);
          const n = Math.sin(a * 3 + z * 0.31) * 0.28 + Math.sin(a * 7 - z * 0.53) * 0.14 + Math.sin(z * 0.17) * 0.35 + Math.sin(a * 13 + z * 1.1) * 0.06;
          const sw = 1 + 0.18 * Math.sin(z * 0.11 + 1.3);
          x *= (1 + n * 0.16) * sw * 1.12; y *= (1 + n * 0.16) * sw;
          y += 1.55; if (y < 0) y = 0 + Math.abs(Math.sin(x * 3 + z)) * 0.04;
          p.setXYZ(i, x + Math.sin(z * 0.08) * 0.6, y, z);
        }
        // faces para dentro
        tube.computeVertexNormals();
        const g = tube.toNonIndexed(), pp = g.attributes.position.array, nn = g.attributes.normal.array;
        for (let i = 0; i < pp.length; i += 9) for (let k = 0; k < 3; k++) { let t0 = pp[i + 3 + k]; pp[i + 3 + k] = pp[i + 6 + k]; pp[i + 6 + k] = t0; t0 = nn[i + 3 + k]; nn[i + 3 + k] = nn[i + 6 + k]; nn[i + 6 + k] = t0; }
        for (let i = 0; i < nn.length; i++) nn[i] = -nn[i];
        B.add(g, M(), (x, y, z) => {
          const mossZone = Math.exp(-((z + 34) * (z + 34)) / 120);
          const band = Math.sin(y * 4.2 + Math.sin(z * 0.7) * 1.4);
          if (y < 0.25) return mossZone > 0.35 && Math.sin(x * 4 + z * 1.7) > -0.3 ? "#5E8A3A" : Math.sin(x * 9 + z * 3) > 0.5 ? "#7A5E44" : "#6A5038";
          if (y < 0.9 && mossZone > 0.45 && Math.sin(z * 2.1 + x * 3) > 0.1) return "#4E7A34";
          return band > 0.55 ? "#8A6A4A" : band < -0.5 ? "#5E4632" : "#74583E";
        });
      }
      const pathX = (z) => Math.sin(z * 0.08) * 0.6;
      // estalactites e estalagmites
      for (let k = 0; k < 70; k++) {
        const z = 4 - r() * 62, side = r() < 0.5 ? -1 : 1, x0 = pathX(z);
        const len = 0.5 + r() * 1.3, rad = 0.12 + r() * 0.22;
        if (r() < 0.62) B.add(new T.ConeGeometry(rad, len, 6), M(x0 + (r() - 0.5) * 3.2, 3.9 - len / 2 + r() * 0.3, z, Math.PI, r() * 3, (r() - 0.5) * 0.2), r() < 0.5 ? "#6E543C" : "#5E4632");
        else B.add(new T.ConeGeometry(rad * 1.2, len * 0.8, 6), M(x0 + side * (1.5 + r() * 0.9), len * 0.35, z, 0, r() * 3, side * 0.15), "#6A5038");
      }
      // pedras soltas e cogumelos que brilham de leve
      for (let k = 0; k < 40; k++) { const z = 4 - r() * 60, s = 0.15 + r() * 0.35; B.add(new T.IcosahedronGeometry(s, 0), M(pathX(z) + (r() < 0.5 ? -1 : 1) * (1.2 + r() * 1.2), s * 0.5, z, r(), r(), r()), "#5E4A3A"); }
      for (let k = 0; k < 26; k++) {
        const z = -18 - r() * 32, x = pathX(z) + (r() < 0.5 ? -1 : 1) * (1.4 + r() * 1.0), h = 0.12 + r() * 0.16;
        B.add(new T.CylinderGeometry(0.025, 0.035, h, 6), M(x, h / 2, z), "#E8E2C8", 0.6);
        B.add(new T.SphereGeometry(0.08 + r() * 0.05, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(x, h, z), r() < 0.5 ? "#9FE0B0" : "#B8F0A0", 1);
      }
      // lamparinas de pedra pelo caminho: o mínimo de luz para seguir
      for (const z of [-4, -16, -28, -40, -50]) {
        const x = pathX(z) + (z % 8 ? 1.6 : -1.6);
        B.add(new T.BoxGeometry(0.22, 0.4, 0.22), M(x, 0.2, z), "#7A746E");
        B.add(new T.BoxGeometry(0.3, 0.06, 0.3), M(x, 0.42, z), "#6A6460");
        B.add(new T.SphereGeometry(0.06, 8, 6), M(x, 0.5, z, 0, 0, 0, 1, 1.5, 1), "#FFC86A", 1);
      }
      // a boca da caverna, atrás de quem entra, com a luz do dia
      B.add(new T.CircleGeometry(2.8, 24), M(0, 1.7, 8.5, 0, Math.PI, 0, 1.15, 0.9, 1), "#C9D6DA", 1);
      // fundo onde o nó espera
      B.add(new T.SphereGeometry(2.6, 20, 14), M(pathX(-58), 1.6, -60.5, 0, 0, 0, 1.2, 1, 0.6), "#3E2E22");
      scene.add(new T.Mesh(B.build(), mat));
      // o fio dourado no chão
      const pts = []; for (let k = 0; k <= 60; k++) { const z = START + 1 - k * (START + 1 - KNOT.z) / 60; pts.push(new T.Vector3(Math.sin(z * 0.08) * 0.6 + Math.sin(k * 0.5) * 0.25, 0.06 + (k > 54 ? (k - 54) * 0.25 : 0), z)); }
      pts[pts.length - 1].copy(KNOT);
      const curve = new T.CatmullRomCurve3(pts);
      const glowMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uTime: { value: 0 }, uOn: { value: 0.5 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `uniform float uTime, uOn; varying vec2 vUv; void main(){ float p=0.55+0.45*sin(vUv.x*80.0-uTime*3.0); gl_FragColor=vec4(vec3(1.0,0.72,0.3)*p*uOn,1.0); }` });
      thread = new T.Mesh(new T.TubeGeometry(curve, 400, 0.018, 5, false), glowMat); scene.add(thread);
      // o nó
      knotMat = new T.ShaderMaterial({ uniforms: { uGlow: { value: 0.8 }, uTime: { value: 0 } },
        vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`,
        fragmentShader: `uniform float uGlow, uTime; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.0-abs(dot(normalize(vN),normalize(vV))),1.5); vec3 c=mix(vec3(0.85,0.55,0.18),vec3(1.0,0.92,0.6),f)*(0.7+uGlow*0.8); gl_FragColor=vec4(c,1.0); }` });
      knot = new T.Mesh(new T.TorusKnotGeometry(0.32, 0.08, 160, 16, 2, 3), knotMat); knot.position.copy(KNOT); scene.add(knot);
      halo = new T.Mesh(new T.PlaneGeometry(4, 4), new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uA: { value: 0.6 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `uniform float uA; varying vec2 vUv; void main(){ float d=length(vUv-0.5)*2.0; float a=smoothstep(1.0,0.0,d); a=a*a*uA; gl_FragColor=vec4(vec3(1.0,0.7,0.3)*a,a); }` }));
      halo.position.copy(KNOT); scene.add(halo);
      scene.userData.glowMat = glowMat;
      // poeira
      const dg = new T.BufferGeometry(), dp = []; for (let k = 0; k < 220; k++) { const x = (r() - 0.5) * 3, y = r() * 3; if (Math.abs(x) < 0.5 && Math.abs(y - 1.55) < 0.5) continue; dp.push(x, y, 4 - r() * 62); }
      dg.setAttribute("position", new T.Float32BufferAttribute(dp, 3));
      scene.add(new T.Points(dg, new T.PointsMaterial({ color: 0xc9a46a, size: 0.012, transparent: true, opacity: 0.45 })));
      env.uPL.value[0].copy(KNOT); env.uPLC.value[0].set("#E0A458"); env.uPLR.value[0] = 3;
      env.uPL.value[1].set(0, 2.0, 6.5); env.uPLC.value[1].set("#B0C0CC"); env.uPLR.value[1] = 7;
      env.uPL.value[2].set(Math.sin(-34 * 0.08) * 0.6, 0.6, -34); env.uPLC.value[2].set("#8FD08A"); env.uPLR.value[2] = 4.0;
      titleEl = document.createElement("div"); titleEl.className = "nos-reveal"; titleEl.setAttribute("aria-hidden", "true"); titleEl.innerHTML = "<span>NÓS</span><small>entre fios e sombras</small>";
    }

    // som: um zumbido grave enquanto anda, passos abafados
    function startDrone() {
      try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        if (audio.state === "suspended") audio.resume();
        const ctx = audio, g = ctx.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2);
        const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(); o1.frequency.value = 55; o2.frequency.value = 55.7; o1.type = o2.type = "sine";
        o1.connect(g); o2.connect(g); g.connect(ctx.destination); o1.start(); o2.start();
        drone = { g, o1, o2 };
      } catch (e) { /* sem áudio */ }
    }
    // som do nó encontrado: um sino suave com brilho
    function chime() {
      try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        if (audio.state === "suspended") audio.resume();
        const ctx = audio, now = ctx.currentTime, out = ctx.createGain(); out.gain.value = 0.22; out.connect(ctx.destination);
        [[523.25, 1], [784, 0.5], [1046.5, 0.35], [1318.5, 0.22], [2093, 0.12]].forEach(([f, a], i) => {
          const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = f * (1 + (i % 2) * 0.002);
          g.gain.setValueAtTime(0, now + i * 0.04); g.gain.linearRampToValueAtTime(a, now + i * 0.04 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + 4.5 + i * 0.3);
          o.connect(g); g.connect(out); o.start(now + i * 0.04); o.stop(now + 5.5);
        });
        for (let k = 0; k < 9; k++) { const o = ctx.createOscillator(), g = ctx.createGain(), t0 = now + 0.3 + k * 0.11; o.type = "triangle"; o.frequency.value = 1800 + Math.random() * 1600; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5); o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + 0.6); }
      } catch (e) { /* sem áudio */ }
    }
    function creak() {
      if (!audio) return;
      try { const ctx = audio, o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(), now = ctx.currentTime; o.type = "sawtooth"; o.frequency.setValueAtTime(140 + Math.random() * 60, now); o.frequency.linearRampToValueAtTime(90 + Math.random() * 40, now + 0.5);
        f.type = "bandpass"; f.frequency.value = 600; f.Q.value = 6; g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.05, now + 0.08); g.gain.linearRampToValueAtTime(0, now + 0.55); o.connect(f); f.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + 0.6); } catch (e) { /* sem áudio */ }
    }
    function stopDrone() { if (drone && audio) { try { drone.g.gain.linearRampToValueAtTime(0, audio.currentTime + 0.6); drone.o1.stop(audio.currentTime + 0.7); drone.o2.stop(audio.currentTime + 0.7); } catch (e) { /* parado */ } } drone = null; }
    function footstep() {
      if (!audio) return;
      try { const ctx = audio, b = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
        const s = ctx.createBufferSource(); s.buffer = b; const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 260; const g = ctx.createGain(); g.gain.value = 0.35; s.connect(f); f.connect(g); g.connect(ctx.destination); s.start(); } catch (e) { /* sem áudio */ }
    }
    function say(t) { line.textContent = t; line.classList.remove("show"); void line.offsetWidth; line.classList.add("show"); }
    function reveal() {
      if (found) return;
      found = 0.001; flash = 1;
      stopDrone(); chime();
      el.appendChild(titleEl); titleEl.classList.remove("show"); void titleEl.offsetWidth; titleEl.classList.add("show");
      $("worldAction").hidden = true; hint.textContent = "";
      clearTimeout(timer); timer = setTimeout(() => { if (current !== api) return; api.dossierReady = true; showDossier(); }, 3600);
    }
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    const onDown = (e) => { if (e.target !== canvas) return;
      if (arrived) { const rc = canvas.getBoundingClientRect(); ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1); ray.setFromCamera(ndc, camera); if (ray.intersectObject(knot).length || ray.intersectObject(halo).length) reveal(); return; }
      holding = true; };
    const onUp = () => { holding = false; };
    const onWheel = (e) => { if (!arrived) wheel = Math.min(3, wheel + Math.abs(e.deltaY) / 300); };
    const onKey = (e) => { if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") { holding = e.type === "keydown"; if (e.type === "keydown") e.preventDefault(); } if (arrived && (e.key === "Enter" || e.key === " ") && e.type === "keydown") reveal(); };
    const act = $("worldAction");
    const actDown = () => { if (arrived) reveal(); else holding = true; };

    const api = {
      template: "dossierNos", dossierLabel: "Ver a história do Nós", entered: false, kamiColor: "ink",
      titleHTML: `<span class="w-kicker">A montanha da névoa</span><span class="w-name nos">&nbsp;</span>`,
      hintText: "Segure para andar. Siga o fio.",
      walkTo: (z) => { walk = z; }, reveal: () => reveal(),
      build,
      start() {
        time = 0; walk = START; holding = false; wheel = 0; said = 0; arrived = false; found = 0; flash = 0; api.dossierReady = false;
        camera.position.set(0, 1.55, walk); camera.lookAt(0, 1.5, walk - 5);
        canvas.addEventListener("pointerdown", onDown); addEventListener("pointerup", onUp); canvas.addEventListener("wheel", onWheel, { passive: true });
        addEventListener("keydown", onKey); addEventListener("keyup", onKey);
        act.hidden = false; act.textContent = "Segurar para andar"; act.onclick = null;
        act.addEventListener("pointerdown", actDown); act.addEventListener("click", api._actClick = () => { if (arrived) reveal(); });
        $("worldCount").hidden = true;
        try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === "suspended") audio.resume(); } catch (e) { /* sem áudio */ }
      },
      stop() {
        clearTimeout(timer); stopDrone();
        canvas.removeEventListener("pointerdown", onDown); removeEventListener("pointerup", onUp); canvas.removeEventListener("wheel", onWheel);
        removeEventListener("keydown", onKey); removeEventListener("keyup", onKey);
        act.removeEventListener("pointerdown", actDown); act.removeEventListener("click", api._actClick); act.hidden = true;
        if (titleEl && titleEl.parentNode) titleEl.parentNode.removeChild(titleEl);
        if (audioEl) audioEl.pause();
      },
      resize(w, h) {
        camera.aspect = w / h; camera.fov = w / h < 0.9 ? 72 : 56; camera.updateProjectionMatrix();
        const ph = small ? 200 : 260;
        rt.setSize(Math.round(ph * w / h), ph); postMat.uniforms.uRes.value.set(Math.round(ph * w / h), ph);
      },
      update(dt) {
        time += dt;
        const speed = holding ? 3.2 : 0;
        const before = walk;
        if (!arrived) { walk -= (speed + wheel * 2.4) * dt; wheel = Math.max(0, wheel - dt * 2); }
        if (walk <= END && !arrived) { walk = END; arrived = true; act.textContent = "Tocar no nó"; hint.textContent = "Toque no nó que brilha."; }
        const moving = before - walk > 0.0001;
        stepAcc += before - walk; if (stepAcc > 0.85) { stepAcc = 0; footstep(); if (Math.random() < 0.18) setTimeout(creak, 120); }
        const prog = (START - walk) / (START - END);
        const nextLine = Math.floor(prog * (LINES.length + 1));
        if (nextLine > said && said < LINES.length && nextLine <= LINES.length) { said = nextLine; say(LINES[said - 1]); }
        const bob = moving ? Math.sin(time * 9) * 0.03 : 0;
        camera.position.set(Math.sin(walk * 0.08) * 0.6 + Math.sin(time * 0.7) * 0.05 + pointer.sx * 0.15, 1.55 + bob, walk);
        camera.lookAt(Math.sin((walk - 6) * 0.08) * 0.6 + pointer.sx * 0.6, 1.5 - pointer.sy * 0.3, walk - 6);
        // o nó brilha mais conforme se aproxima
        const near = Math.max(0, 1 - (walk - KNOT.z) / 50);
        knot.rotation.y += dt * (0.5 + found * 3); knot.rotation.x = Math.sin(time * 0.8) * 0.3;
        if (found) { found = Math.min(1, found + dt * 0.5); knot.scale.setScalar(1 + found * 0.8); }
        knotMat.uniforms.uGlow.value = 0.5 + near * 0.6 + Math.sin(time * 3) * 0.15 + found;
        halo.quaternion.copy(camera.quaternion); halo.material.uniforms.uA.value = 0.35 + near * 0.5 + found * 1.5;
        env.uPLR.value[0] = 2 + near * 5 + found * 20;
        scene.userData.glowMat.uniforms.uTime.value = time; scene.userData.glowMat.uniforms.uOn.value = 0.35 + near * 0.4 + found;
        flash = Math.max(0, flash - dt * 0.9); postMat.uniforms.uFlash.value = flash * flash;
        postMat.uniforms.uTime.value = time;
        if (audioEl && !audioEl.paused) audioEl.volume = Math.max(0, Math.min(0.55, audioEl.volume + dt * 0.2));
      },
      render(r) { r.setRenderTarget(rt); r.render(scene, camera); r.setRenderTarget(null); r.render(post, postCam); },
    };
    return api;
  })();

  /* =================================================================== */
  /* TORRE DOS GRIMÓRIOS                                                  */
  /* =================================================================== */
  const torre = (() => {
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(46, 1, 0.1, 400);
    const env = envUniforms({ sun: [0.35, 0.85, 0.25], sunCol: "#46578C", amb: "#40354A", fog: "#130F1A", fogDen: 0.016, glowCol: "#FFD38A" });
    const BASE = window.VALE_BASE || "";
    let DATA = [];
    try { DATA = JSON.parse(document.getElementById("grimorios").textContent); } catch (e) { DATA = []; }
    const META = { CN: ["自", "#4E7A4C"], CH: ["人", "#A4743A"], LG: ["言", "#9C3434"], MT: ["数", "#3E4C86"], MS: ["図", "#2E6E72"], DS: ["開", "#2C4A7A"], PA: ["作", "#5A3E7A"], IO: ["繋", "#7A5A2E"], BD: ["蔵", "#4A5560"] };
    const LECTERN_TOP = new T.Vector3(0, 2.05, 0.1);
    let time = 0, books = [], hovered = null, selected = null, circleMat, candleMat, tip, camFrom = null, camTo = null, camK = 1;
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    // geometria voltada para dentro (paredes vistas de dentro da torre)
    function inward(geo) {
      const g = geo.index ? geo.toNonIndexed() : geo;
      g.computeVertexNormals();
      const p = g.attributes.position.array, n = g.attributes.normal.array;
      for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) { const a = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = a; }
      for (let i = 0; i < n.length; i += 9) for (let k = 0; k < 3; k++) { const a = n[i + 3 + k]; n[i + 3 + k] = n[i + 6 + k]; n[i + 6 + k] = a; }
      for (let i = 0; i < n.length; i++) n[i] = -n[i];
      return g;
    }
    function coverTexture(code, name) {
      const c = document.createElement("canvas"); c.width = 256; c.height = 340;
      const g = c.getContext("2d");
      g.fillStyle = "rgba(0,0,0,0)"; g.clearRect(0, 0, 256, 340);
      g.strokeStyle = "#E3C27A"; g.lineWidth = 6; g.strokeRect(18, 18, 220, 304);
      g.lineWidth = 2; g.strokeRect(30, 30, 196, 280);
      g.fillStyle = "#EFD08A"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "800 130px 'Shippori Mincho', 'Hiragino Mincho ProN', serif"; g.fillText(META[code][0], 128, 150);
      g.font = "500 22px 'Geist Mono', monospace"; g.fillText(code, 128, 262);
      const t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
    }

    function build() {
      const mat = toon(env);
      const B = Builder(); const r = mulberry(31);
      // parede de pedra
      B.add(inward(new T.CylinderGeometry(9, 9, 34, 72, 40, true)), M(0, 17, 0), (x, y, z) => {
        const row = Math.floor((y + 17) / 0.72), th = Math.atan2(z, x);
        const col = Math.floor((th / (Math.PI * 2) + 0.5) * 56 + (row % 2) * 0.5);
        const h = Math.abs(Math.sin(row * 12.9898 + col * 78.233) * 43758.5453) % 1;
        return h < 0.33 ? "#4A4250" : h < 0.66 ? "#544B5A" : "#3F3946";
      });
      // piso de lajes em anéis
      B.add(new T.CircleGeometry(9, 72, 0, Math.PI * 2), M(0, 0, 0, -Math.PI / 2, 0, 0), (x, y) => {
        const rr = Math.hypot(x, y), ring = Math.floor(rr / 1.1), th = Math.atan2(y, x);
        const seg = Math.floor((th / (Math.PI * 2) + 0.5) * (6 + ring * 6));
        return (ring + seg) % 2 ? "#3A3340" : "#433B49";
      });
      // estantes ao redor (exceto onde estão as janelas)
      const windows = [0, Math.PI * 2 / 3, Math.PI * 4 / 3].map((a) => a + Math.PI / 2);
      const leather = ["#6B2E2A", "#2E4A3E", "#3B3A5E", "#7A5A2E", "#4A2E44", "#2E3E5A", "#5E4632", "#8A6A3A"];
      const BAYS = 36;
      for (let b = 0; b < BAYS; b++) {
        const a = (b + 0.5) / BAYS * Math.PI * 2;
        if (windows.some((w) => Math.abs(Math.atan2(Math.sin(a - w), Math.cos(a - w))) < 0.22)) continue;
        const R = 8.55, cx = Math.cos(a) * R, cz = Math.sin(a) * R, rot = -a + Math.PI / 2;
        const Mb = M(cx, 0, cz, 0, rot, 0);
        const width = 2 * Math.PI * R / BAYS - 0.04;
        B.add(new T.BoxGeometry(width, 6.2, 0.06), Mb.clone().multiply(M(0, 3.1, 0.3)), "#3A2618");
        B.add(new T.BoxGeometry(0.08, 6.2, 0.62), Mb.clone().multiply(M(width / 2, 3.1, 0)), "#5A3B26");
        for (let s = 0; s < 5; s++) {
          const y = 0.25 + s * 1.2;
          B.add(new T.BoxGeometry(width, 0.07, 0.62), Mb.clone().multiply(M(0, y, 0)), "#5A3B26");
          let x = -width / 2 + 0.08;
          while (x < width / 2 - 0.12) {
            const w = 0.07 + r() * 0.08, h = 0.62 + r() * 0.36, lean = r() < 0.08 ? 0.25 : 0;
            B.add(new T.BoxGeometry(w, h, 0.42), Mb.clone().multiply(M(x + w / 2, y + 0.035 + h / 2, 0.02, 0, 0, lean)), leather[Math.floor(r() * leather.length)]);
            x += w + 0.005 + (lean ? 0.12 : 0);
          }
        }
      }
      // janelas altas e varandas
      windows.forEach((a) => {
        const x = Math.cos(a) * 8.92, z = Math.sin(a) * 8.92;
        B.add(new T.PlaneGeometry(1.6, 5.2), M(x, 9.5, z, 0, -a - Math.PI / 2, 0), "#5E7FBE", 1);
        B.add(new T.CircleGeometry(0.8, 24, 0, Math.PI), M(x * 0.999, 12.1, z * 0.999, 0, -a - Math.PI / 2, 0), "#5E7FBE", 1);
        B.add(new T.BoxGeometry(0.1, 5.4, 0.12), M(x * 0.99, 9.5, z * 0.99, 0, -a - Math.PI / 2, 0), "#2A2230");
      });
      for (const y of [7.2, 14.4]) {
        B.add(new T.TorusGeometry(8.2, 0.12, 6, 96), M(0, y, 0, Math.PI / 2, 0, 0), "#5A3B26");
        B.add(new T.TorusGeometry(8.2, 0.05, 6, 96), M(0, y + 0.9, 0, Math.PI / 2, 0, 0), "#5A3B26");
        for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2; B.add(new T.CylinderGeometry(0.035, 0.035, 0.9, 5), M(Math.cos(a) * 8.2, y + 0.45, Math.sin(a) * 8.2), "#5A3B26"); }
      }
      // púlpito
      B.add(new T.CylinderGeometry(0.55, 0.7, 0.18, 12), M(0, 0.09, 0), "#4A3020");
      B.add(new T.CylinderGeometry(0.1, 0.14, 1.5, 10), M(0, 0.9, 0), "#5A3B26");
      B.add(new T.BoxGeometry(1.3, 0.08, 0.95), M(0, 1.72, 0.05, -0.38, 0, 0), "#6B4A2E");
      B.add(new T.BoxGeometry(1.3, 0.06, 0.06), M(0, 1.55, 0.5, -0.38, 0, 0), "#6B4A2E");
      scene.add(new T.Mesh(B.build(), mat));

      // círculo mágico no chão
      circleMat = new T.ShaderMaterial({
        transparent: true, depthWrite: false, blending: T.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uPulse: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `uniform float uTime; uniform float uPulse; varying vec2 vUv;
          void main(){
            vec2 p=vUv*2.0-1.0; float r=length(p); float a=atan(p.y,p.x);
            float ring=smoothstep(0.012,0.0,abs(r-0.94))+smoothstep(0.01,0.0,abs(r-0.84))+smoothstep(0.008,0.0,abs(r-0.46))+smoothstep(0.006,0.0,abs(r-0.3));
            float ticks=step(0.85,r)*step(r,0.93)*smoothstep(0.7,1.0,abs(sin(a*48.0-uTime*0.25)))*0.7;
            float hex=0.0;
            for(int k=0;k<6;k++){ float ang=float(k)*1.0472+uTime*0.08; vec2 d=vec2(cos(ang),sin(ang)); hex+=smoothstep(0.01,0.0,abs(dot(p,d)-0.42)); }
            hex*=step(r,0.84);
            float g=(ring+ticks+hex*0.7)*(0.45+0.55*uPulse);
            vec3 col=mix(vec3(0.42,0.66,1.0),vec3(1.0,0.82,0.48),uPulse);
            gl_FragColor=vec4(col*g,g);
          }`,
      });
      const circle = new T.Mesh(new T.PlaneGeometry(8, 8), circleMat); circle.rotation.x = -Math.PI / 2; circle.position.y = 0.03; scene.add(circle);

      // velas flutuando
      const cg = new T.BufferGeometry(), cp = [];
      for (let k = 0; k < 46; k++) { const a = r() * Math.PI * 2, rr = 2.6 + r() * 5; cp.push(Math.cos(a) * rr, 3.5 + r() * 12, Math.sin(a) * rr); }
      cg.setAttribute("position", new T.Float32BufferAttribute(cp, 3));
      candleMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uTime: { value: 0 } },
        vertexShader: `uniform float uTime; varying float vF; void main(){ vec3 p=position; p.y+=sin(uTime*0.7+position.x*3.0)*0.15; vF=0.75+0.25*sin(uTime*9.0+position.z*7.0); vec4 mv=modelViewMatrix*vec4(p,1.0); gl_PointSize=90.0/-mv.z; gl_Position=projectionMatrix*mv; }`,
        fragmentShader: `varying float vF; void main(){ vec2 q=gl_PointCoord-0.5; q.y*=0.7; float d=length(q); float c=smoothstep(0.5,0.0,d); gl_FragColor=vec4(vec3(1.0,0.75,0.4)*c*c*vF,1.0); }` });
      const candles = new T.Points(cg, candleMat); candles.frustumCulled = false; scene.add(candles);
      const CB = Builder();
      for (let k = 0; k < cp.length; k += 3) CB.add(new T.CylinderGeometry(0.05, 0.05, 0.32, 8), M(cp[k], cp[k + 1] - 0.22, cp[k + 2]), "#EDE3CF", 0.4);
      scene.add(new T.Mesh(CB.build(), mat));

      // os grimórios
      DATA.forEach((sub, i) => {
        const meta = META[sub.code] || ["書", "#5A4632"];
        const g = new T.Group();
        const bb = Builder();
        bb.add(new T.BoxGeometry(0.9, 1.2, 0.05), M(0, 0, -0.1), meta[1]);
        bb.add(new T.BoxGeometry(0.84, 1.14, 0.17), M(0.02, 0, 0), "#EFE4CC");
        bb.add(new T.BoxGeometry(0.06, 1.2, 0.26), M(-0.44, 0, 0), meta[1]);
        for (const y of [-0.42, -0.14, 0.14, 0.42]) bb.add(new T.BoxGeometry(0.075, 0.035, 0.27), M(-0.44, y, 0), "#C9A24A");
        const body = new T.Mesh(bb.build(), mat); g.add(body);
        const hinge = new T.Group(); hinge.position.set(-0.45, 0, 0.11); g.add(hinge);
        const fb = Builder();
        fb.add(new T.BoxGeometry(0.9, 1.2, 0.05), M(0.45, 0, 0), meta[1]);
        for (const [x, y] of [[0.1, 0.55], [0.8, 0.55], [0.1, -0.55], [0.8, -0.55]]) fb.add(new T.BoxGeometry(0.12, 0.12, 0.06), M(x, y, 0.01), "#C9A24A");
        hinge.add(new T.Mesh(fb.build(), mat));
        const label = new T.Mesh(new T.PlaneGeometry(0.7, 0.93), new T.MeshBasicMaterial({ map: coverTexture(sub.code, sub.name), transparent: true, depthWrite: false }));
        label.position.set(0.45, 0, 0.03); hinge.add(label);
        const hit = new T.Mesh(new T.BoxGeometry(1.2, 1.5, 0.6), new T.MeshBasicMaterial()); hit.visible = false; hit.userData.book = i; g.add(hit);
        scene.add(g);
        books.push({ g, hinge, hit, sub, a0: i / DATA.length * Math.PI * 2, open: 0, glow: 0, mat: body.material });
      });

      env.uPL.value[0].set(0, 6.8, 0); env.uPLC.value[0].set("#6F8FE0"); env.uPLR.value[0] = 3.6;
      env.uPL.value[1].set(0, 9, 0); env.uPLC.value[1].set("#FFC67A"); env.uPLR.value[1] = 7;
      env.uPL.value[2].set(0, 2.8, 0.9); env.uPLC.value[2].set("#9C7E52"); env.uPLR.value[2] = 0.001;

      tip = document.createElement("div"); tip.className = "w-label"; tip.style.opacity = "0";
    }

    function bookPose(b, t) {
      const a = b.a0 + t * 0.05 + (api.arrive || 0) * (api.arrive || 0) * 6.0;
      return { pos: new T.Vector3(Math.cos(a) * 3.9, 2.5 + Math.sin(t * 0.8 + b.a0 * 3) * 0.18, Math.sin(a) * 3.9), rotY: -a + Math.PI / 2 };
    }
    const PAL = { CN: "matcha", CH: "sunset", LG: "sakura", MT: "sky", MS: "matcha", DS: "lavender", PA: "lavender", IO: "gold", BD: "gold" };
    function grimoireHTML(sub) {
      const cat = sub.cat === "curso-tecnico" ? "Curso Técnico" : "Ensino Médio";
      const kj = (META[sub.code] || ["書"])[0], pal = PAL[sub.code] || "gold";
      const cover = `<section class="kc" data-c="${pal}" data-k="${kj}"><span class="kc-kicker">Grimório · ${cat}</span><h2>${esc(sub.name)}</h2><p>${esc(sub.desc)}</p>
        <p class="kc-count">${sub.acts.length} ${sub.acts.length === 1 ? "feitiço aprendido" : "feitiços aprendidos"}</p>
        <ol class="kc-toc">${sub.acts.map((a, n) => `<li><button type="button" data-goto="${n + 1}"><i>${String(n + 1).padStart(2, "0")}</i><b>${esc(a.t)}</b><small>${a.tri}º tri</small></button></li>`).join("")}</ol></section>`;
      const spells = sub.acts.map((a, n) => {
        const imgs = [a.img, a.img2 && a.img2 !== a.img ? a.img2 : null].filter(Boolean).map((u) => `<img src="${esc(u.startsWith("http") ? u : BASE + u)}" alt="" loading="lazy" onerror="this.remove()">`);
        const pics = imgs.length === 2 ? `<div class="kc-imgs">${imgs.join("")}</div>` : imgs.length ? imgs[0].replace("<img ", '<img class="kc-img" ') : "";
        const k = a.k ? `<h3>Competências</h3><div class="kc-cols">${a.k.map(([c, d]) => `<div class="kc-box"><b>${esc(c)}</b><small>${esc(d)}</small></div>`).join("")}</div>` : "";
        const l = a.l && a.l.length ? `<h3>Ver a atividade</h3><ul class="kc-links">${a.l.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noreferrer">${esc(t)}</a></li>`).join("")}</ul>` : `<p class="kc-nolink">Esta atividade não tem link público.</p>`;
        return `<section class="kc" data-c="${pal}" data-k="${kj}"><span class="kc-kicker">Feitiço ${n + 1} · ${a.tri}º trimestre</span><h2>${esc(a.t)}</h2><p><em>${esc(a.s)}</em></p>${pics}${a.r ? `<p>${esc(a.r)}</p>` : ""}${l}${k}</section>`;
      }).join("");
      return cover + spells;
    }
    function select(i) {
      if (selected === i) return;
      selected = i;
      const b = books[i];
      $("dossierBody").innerHTML = grimoireHTML(b.sub);
      hint.textContent = "";
      setTimeout(() => { if (current === api && selected === i) showDossier(); }, 900);
      camFrom = { pos: camera.position.clone(), tgt: camera.userData.tgt.clone() };
      camTo = { pos: new T.Vector3(0.9, 3.3, 3.2), tgt: new T.Vector3(1.0, 1.75, 0) };
      camK = 0;
    }
    function deselect() {
      if (selected === null) return;
      selected = null; hint.textContent = "Toque num grimório.";
      camFrom = { pos: camera.position.clone(), tgt: camera.userData.tgt.clone() }; camTo = null; camK = 0;
    }
    function pick(e) {
      const rc = canvas.getBoundingClientRect();
      ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const h = ray.intersectObjects(books.map((b) => b.hit))[0];
      return h ? h.object.userData.book : null;
    }
    const onMove = (e) => { if (e.target !== canvas) return; hovered = pick(e); canvas.style.cursor = hovered !== null ? "pointer" : ""; };
    const onClick = (e) => { if (e.target !== canvas) return; const i = pick(e); if (i !== null) select(i); };

    const api = {
      template: "dossierTorre", dossierLabel: "Abrir o grimório", select: (i) => select(i),
      titleHTML: `<span class="w-kicker">Ilhota norte</span><span class="w-name">Torre dos Grimórios</span>`,
      hintText: "Toque num grimório.",
      build,
      start() {
        time = 0; selected = null; hovered = null; camK = 1; camTo = null;
        camera.position.set(0, 4.3, 6.9); camera.userData.tgt = new T.Vector3(0, 3.0, 0);
        api.arrive = api.tpIn ? 1 : 0; api.tpIn = false;
        books.forEach((b) => { b.open = 0; });
        labels.appendChild(tip);
        canvas.addEventListener("click", onClick); canvas.addEventListener("pointermove", onMove);
        $("worldAction").hidden = true;
        api.onDossierClose = deselect;
      },
      stop() { canvas.removeEventListener("click", onClick); canvas.removeEventListener("pointermove", onMove); canvas.style.cursor = ""; },
      resize(w, h) { camera.aspect = w / h; camera.fov = w / h < 0.9 ? 74 : 58; camera.updateProjectionMatrix(); },
      update(dt) {
        time += dt;
        circleMat.uniforms.uTime.value = time; candleMat.uniforms.uTime.value = time;
        circleMat.uniforms.uPulse.value += ((selected !== null ? 1 : 0) - circleMat.uniforms.uPulse.value) * Math.min(1, dt * 2);
        env.uPLR.value[2] = lerp(env.uPLR.value[2], selected !== null ? 1.5 : 0.001, Math.min(1, dt * 2));
        books.forEach((b, i) => {
          const pose = bookPose(b, time);
          const isSel = selected === i;
          b.k = lerp(b.k || 0, isSel ? 1 : 0, Math.min(1, dt * 2.2));
          const pos = pose.pos.clone().lerp(LECTERN_TOP, ease(b.k));
          b.g.position.copy(pos);
          b.g.rotation.set(lerp(0, -1.18, ease(b.k)), lerp(pose.rotY, 0, ease(b.k)), Math.sin(time + i) * 0.05 * (1 - b.k));
          b.hinge.rotation.y = lerp(0, -2.75, smooth(0.45, 1, b.k));
          const glow = (hovered === i && !isSel ? 1 : 0) + b.k * 0.6;
          b.glow = lerp(b.glow, glow, Math.min(1, dt * 6));
          b.g.scale.setScalar(1 + b.glow * 0.08);
        });
        // câmera
        const orbit = time * 0.04 + pointer.sx * 0.25;
        const idle = { pos: new T.Vector3(Math.sin(orbit) * 6.9, 4.3 - pointer.sy * 0.8, Math.cos(orbit) * 6.9), tgt: new T.Vector3(0, 3.0, 0) };
        // chegada do teletransporte: do alto da torre, descendo em espiral até o círculo
        if (api.arrive > 0) {
          api.arrive = Math.max(0, api.arrive - dt / 3.2);
          const k = ease(1 - api.arrive), a = orbit + (1 - k) * 5.5;
          const rr = lerp(1.2, 6.9, k), yy = lerp(19, 4.3, k);
          idle.pos.set(Math.sin(a) * rr, yy, Math.cos(a) * rr); idle.tgt.set(0, lerp(0, 3.0, k), 0);
          circleMat.uniforms.uPulse.value = Math.max(circleMat.uniforms.uPulse.value, api.arrive);
          camera.position.copy(idle.pos); camera.userData.tgt.copy(idle.tgt); camK = 1; camFrom = null;
        }
        camK = Math.min(1, camK + dt / 2.0);
        const dest = camTo || idle;
        if (camK < 1 && camFrom) { const e = ease(camK); camera.position.copy(camFrom.pos).lerp(dest.pos, e); camera.userData.tgt.copy(camFrom.tgt).lerp(dest.tgt, e); }
        else { camera.position.lerp(dest.pos, Math.min(1, dt * 3)); camera.userData.tgt.lerp(dest.tgt, Math.min(1, dt * 3)); }
        camera.lookAt(camera.userData.tgt);
        // dica sobre o livro em foco
        if (hovered !== null && selected === null) {
          const b = books[hovered], v = b.g.position.clone().add(new T.Vector3(0, 0.95, 0)).project(camera);
          tip.innerHTML = `<b>${esc(b.sub.name)}</b><span>${b.sub.acts.length} ${b.sub.acts.length === 1 ? "feitiço" : "feitiços"}</span>`;
          tip.style.transform = `translate(-50%, -100%) translate(${(v.x * 0.5 + 0.5) * W}px, ${(-v.y * 0.5 + 0.5) * H}px)`;
          tip.style.opacity = "1";
        } else tip.style.opacity = "0";
      },
      render(rr) { rr.setRenderTarget(null); rr.render(scene, camera); },
    };
    return api;
  })();

  /* =================================================================== */
  /* TREM SOBRE A ÁGUA (galeria)                                          */
  /* =================================================================== */
  const trem = (() => {
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(58, 1, 0.1, 1500);
    const env = envUniforms({ sun: [-0.35, 0.32, -0.88], sunCol: "#FFC59A", amb: "#4A3A44", fog: "#E9B9A2", fogDen: 0.006, glowCol: "#FFD49A" });
    const BASE = window.VALE_BASE || "";
    // lembranças em ordem: a viagem começa na infância e segue pelas feiras
    const MEMS = [
      { src: "trem/infancia-aviao.jpg", tag: "Infância", t: "Uma das primeiras viagens", d: "Pequeno, sentado na janela do avião. A jornada começa bem antes de a gente perceber." },
      { src: "trem/florianopolis.jpg", tag: "Florianópolis", t: "Fernando Rateke", d: "Registro pessoal e início do percurso como desenvolvedor e pesquisador." },
      { src: "trem/grupo-5.jpg", tag: "Iniciação Científica", t: "Antigo Grupo 5", d: "O antigo Grupo 5 de Iniciação Científica: pesquisa e desenvolvimento em equipe." },
      { src: "trem/ic-2026.jpg", tag: "Iniciação Científica", t: "Seleção da IC 2026", d: "A nova seleção da Iniciação Científica, reunida diante da bandeira do grupo." },
      { src: "trem/tias.jpg", tag: "Aeroporto de Florianópolis", t: "Com as minhas tias", d: "Antes do embarque para a FEBRACE, com as minhas tias, a quem devo um agradecimento enorme por tudo." },
      { src: "trem/aeroporto.jpg", tag: "Aeroporto de Florianópolis", t: "A bandeira na mala", d: "Com a bandeira da Iniciação Científica no Aeroporto de Florianópolis, antes de seguir para São Paulo." },
      { src: "trem/febrace-2026.jpg", tag: "Aeroporto de Florianópolis", t: "Rumo à FEBRACE 2026", d: "A equipe reunida antes do voo para São Paulo." },
      { src: "trem/sao-paulo.jpg", tag: "São Paulo", t: "São Paulo", d: "A roda-gigante e a imersão durante a participação num evento científico e acadêmico nacional." },
      { src: "trem/febrace.jpg", tag: "FEBRACE · São Paulo", t: "FEBRACE", d: "Apresentação e defesa de projeto na Feira Brasileira de Ciências e Engenharia, em São Paulo." },
      { src: "trem/dual.jpg", tag: "Feira internacional", t: "DUAL International Fair 2026", d: "A equipe da Iniciação Científica na DUAL International Fair 2026." },
      { src: "trem/febic-estande.jpg", tag: "XI FEBIC · Joinville", t: "O estande do AcousticBuild", d: "O AcousticBuild apresentado na XI Feira Brasileira de Iniciação Científica, em Joinville." },
      { src: "trem/febic-equipe.jpg", tag: "XI FEBIC · Joinville", t: "Certificado e troféu", d: "A equipe do AcousticBuild com o certificado, o troféu e as medalhas da FEBIC." },
      { src: "trem/febic-palco.jpg", tag: "XI FEBIC · Joinville", t: "2º lugar", d: "Segundo lugar em Ciências Exatas e da Terra, no Ensino Médio, com credencial para a FoCiTeCu 2027, na Argentina." },
      { src: "trem/febic-amigos.jpg", tag: "XI FEBIC · Joinville", t: "Fim de feira", d: "Medalhas, troféus e amigos de outro país no encerramento da XI FEBIC." },
    ];
    const L = Math.max(112, MEMS.length * 10), SPEED0 = 3.6;
    let time = 0, travel = 0, speed = SPEED0, target = SPEED0, movers = [], photos = [], hovered = null, open = null, audio = null, clackTimer = null, rumble = null, final = false, fimEl = null;
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    const wrap = (x) => ((x % L) + L) % L - L / 2;
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const SKY = `
      uniform float uDark;
      float hsh(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
      vec3 skyCol(vec3 d){
        float y=d.y;
        vec3 top=vec3(0.30,0.40,0.66), mid=vec3(0.90,0.66,0.66), low=vec3(1.0,0.84,0.64);
        vec3 c=mix(low,mid,smoothstep(0.0,0.16,y)); c=mix(c,top,smoothstep(0.14,0.62,y));
        float s=max(dot(d,normalize(vec3(-0.45,0.09,-0.89))),0.0);
        c+=vec3(1.0,0.78,0.5)*pow(s,10.0)*0.6+vec3(1.0,0.96,0.85)*smoothstep(0.9986,0.9993,s)*(1.0-uDark);
        vec3 n=mix(vec3(0.16,0.12,0.26),vec3(0.03,0.04,0.11),smoothstep(0.0,0.5,y));
        n+=vec3(0.32,0.16,0.26)*pow(s,6.0)*0.6;
        float st=step(0.9962,hsh(floor(d*360.0)))*smoothstep(0.04,0.2,y);
        n+=vec3(0.9,0.92,1.0)*st*(0.6+0.4*sin(hsh(floor(d*360.0))*80.0));
        return mix(c,n,uDark);
      }`;
    const UD = { value: 0 };

    function build() {
      const mat = toon(env);
      // céu
      const sky = new T.Mesh(new T.SphereGeometry(1200, 40, 20), new T.ShaderMaterial({
        side: T.BackSide, depthWrite: false, uniforms: { uDark: UD },
        vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `${NOISE} ${SKY} varying vec3 vD;
          void main(){ vec3 d=normalize(vD); vec3 c=skyCol(d);
            float band=snoise(vec2(atan(d.z,d.x)*2.4,d.y*11.0))*0.5+0.5;
            float cl=smoothstep(0.6,0.82,band)*smoothstep(0.04,0.1,d.y)*smoothstep(0.36,0.16,d.y);
            c=mix(c,mix(vec3(0.99,0.74,0.72),vec3(0.22,0.2,0.34),uDark),cl*0.7);
            gl_FragColor=vec4(c,1.0); }`,
      }));
      sky.renderOrder = -1; scene.add(sky); scene.userData.sky = sky;

      // água que reflete o céu, com ondulações e o caminho de brilho do sol
      const water = new T.Mesh(new T.PlaneGeometry(1600, 1600, 1, 1), new T.ShaderMaterial({
        uniforms: { uTravel: { value: 0 }, uTime: { value: 0 }, uDark: UD },
        vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
        fragmentShader: `${NOISE} ${SKY} uniform float uTravel; uniform float uTime; varying vec3 vW;
          void main(){
            vec2 q=vW.xz+vec2(uTravel,0.0);
            float n=snoise(q*vec2(0.08,0.35)+uTime*0.05)*0.6+snoise(q*vec2(0.3,1.2)-uTime*0.2)*0.4;
            vec3 V=normalize(vW-cameraPosition);
            vec3 R=reflect(V,normalize(vec3(n*0.04,1.0,n*0.06)));
            vec3 c=skyCol(R)*0.92;
            float d=length(vW-cameraPosition);
            c=mix(c*vec3(0.78,0.84,0.92),c,smoothstep(4.0,60.0,d));
            c+=vec3(1.0,0.86,0.6)*smoothstep(0.55,0.95,n)*0.12*(1.0-smoothstep(10.0,120.0,d))*(1.0-uDark*0.8);
            gl_FragColor=vec4(c,1.0);
          }`,
      }));
      water.rotation.x = -Math.PI / 2; water.position.y = -0.35; scene.add(water); scene.userData.water = water;

      // o vagão
      const B = Builder();
      const WOOD = "#3E2418", WOOD_L = "#5E3A26", SEAT = "#4E1C1A", BRASS = "#B8913E";
      B.add(new T.BoxGeometry(16, 0.12, 3.0), M(0, -0.06, 0), "#3E271B");
      B.add(new T.BoxGeometry(16, 0.08, 3.0), M(0, 2.66, 0), "#4A3022");
      const winX = [-6.4, -3.2, 0, 3.2, 6.4], ww = 2.8, wy0 = 0.9, wy1 = 2.4;
      B.add(new T.BoxGeometry(16, wy0, 0.12), M(0, wy0 / 2, -1.45), WOOD);
      B.add(new T.BoxGeometry(16, 2.66 - wy1, 0.12), M(0, (wy1 + 2.66) / 2, -1.45), WOOD);
      for (let k = 0; k <= winX.length; k++) {
        const xa = k === 0 ? -8 : winX[k - 1] + ww / 2, xb = k === winX.length ? 8 : winX[k] - ww / 2;
        B.add(new T.BoxGeometry(xb - xa, wy1 - wy0, 0.12), M((xa + xb) / 2, (wy0 + wy1) / 2, -1.45), WOOD);
      }
      winX.forEach((x) => {
        B.add(new T.BoxGeometry(ww + 0.12, 0.08, 0.2), M(x, wy0, -1.38), WOOD_L);
        B.add(new T.BoxGeometry(ww + 0.12, 0.08, 0.2), M(x, wy1, -1.38), WOOD_L);
      });
      // bancos dos dois lados
      for (const [z, back] of [[-1.05, -1.32], [1.05, 1.32]]) {
        B.add(new T.BoxGeometry(15, 0.16, 0.6), M(0, 0.48, z), SEAT);
        B.add(new T.BoxGeometry(15, 0.42, 0.5), M(0, 0.2, z), WOOD);
        B.add(new T.BoxGeometry(15, 0.36, 0.12), M(0, 0.74, back), SEAT);
      }
      // alças e lâmpadas no teto
      for (let x = -6.5; x <= 6.5; x += 1.3) {
        B.add(new T.CylinderGeometry(0.008, 0.008, 0.28, 4), M(x, 2.48, 0), "#3A2A20");
        B.add(new T.TorusGeometry(0.06, 0.01, 6, 14), M(x, 2.3, 0, 0, Math.PI / 2, 0), BRASS);
      }
      B.add(new T.CylinderGeometry(0.02, 0.02, 16, 6), M(0, 2.6, 0, 0, 0, Math.PI / 2), BRASS);
      for (const x of [-4.8, 0, 4.8]) {
        B.add(new T.SphereGeometry(0.14, 12, 8), M(x, 2.48, 0), "#FFE2A8", 1);
        B.add(new T.CylinderGeometry(0.16, 0.2, 0.06, 12), M(x, 2.6, 0), BRASS);
      }
      // parede do lado da câmera (vista ao olhar em volta)
      B.add(new T.BoxGeometry(16, 2.66, 0.12), M(0, 1.33, 1.5), WOOD);
      scene.add(new T.Mesh(B.build(), mat));

      // o dragão branco, bem longe, cruzando o céu de vez em quando
      {
        const dg = new T.Group(); dg.visible = false; scene.add(dg); dg.scale.setScalar(1);
        const bodyM = new T.MeshBasicMaterial({ color: 0xf1f4f2 }), maneM = new T.MeshBasicMaterial({ color: 0x6fb89a });
        const segs = [];
        for (let i = 0; i < 46; i++) {
          const k = i / 45, r0 = (i < 3 ? 1.5 : 1.25) * (1 - k * 0.75) + 0.15;
          const sgm = new T.Mesh(new T.SphereGeometry(r0, 10, 8), bodyM); dg.add(sgm);
          let mane = null;
          if (i % 2 === 0 && i < 40) { mane = new T.Mesh(new T.ConeGeometry(r0 * 0.5, r0 * 1.8, 5), maneM); dg.add(mane); }
          segs.push({ m: sgm, mane, r: r0 });
        }
        const head = new T.Group(); dg.add(head);
        { const hm = new T.Mesh(new T.SphereGeometry(1, 12, 10), bodyM); hm.scale.set(2.6, 1.3, 1.4); head.add(hm); }
        for (const sz of [-1, 1]) { const h = new T.Mesh(new T.ConeGeometry(0.22, 2.4, 6), bodyM); h.position.set(-0.8, 1.4, sz * 0.6); h.rotation.set(sz * 0.3, 0, 0.9); head.add(h); }
        const beard = new T.Mesh(new T.ConeGeometry(0.5, 2.2, 5), maneM); beard.position.set(-1.4, -0.6, 0); beard.rotation.z = -1.2; head.add(beard);
        scene.userData.dragon = { g: dg, segs, head, t: -1, next: 22 };
      }

      // passageiro-sombra, translúcido, no banco da janela
      const shadow = new T.Group(); shadow.position.set(-4.6, 0.56, -1.0); scene.add(shadow);
      const sm = new T.MeshBasicMaterial({ color: 0x0b0a12, transparent: true, opacity: 0.62, depthWrite: false });
      const s1 = new T.Mesh(new T.CapsuleGeometry(0.22, 0.5, 6, 12), sm); s1.position.y = 0.45; shadow.add(s1);
      const s2 = new T.Mesh(new T.SphereGeometry(0.17, 16, 12), sm); s2.position.y = 1.0; shadow.add(s2);
      const s3 = new T.Mesh(new T.CapsuleGeometry(0.09, 0.35, 4, 8), sm); s3.position.set(0, 0.0, 0.3); s3.rotation.x = Math.PI / 2; shadow.add(s3);

      // cenário que passa: postes com fios, ilhotas, casinhas, uma estação
      const r = mulberry(18);
      const poleGeo = Builder().add(new T.CylinderGeometry(0.07, 0.09, 6, 6), M(0, 2.6, 0), "#2A2224").add(new T.BoxGeometry(1.4, 0.08, 0.08), M(0, 5.2, 0), "#2A2224").add(new T.BoxGeometry(1.0, 0.07, 0.07), M(0, 4.7, 0), "#2A2224").build();
      for (let k = 0; k < 14; k++) { const m = new T.Mesh(poleGeo, mat); m.position.set(0, -0.35, -10.5); scene.add(m); movers.push({ m, base: k * (L / 14), z: -10.5 }); }
      // L/14 = 8 unidades entre postes
      const wireGeo = new T.BufferGeometry();
      const wpts = []; for (let k = 0; k <= 64; k++) { const x = -L / 2 + k * (L + L / 14) / 64; wpts.push(x, 4.85 - 0.35 * Math.pow(Math.sin(((x / (L / 14)) % 1) * Math.PI), 1), -10.5); }
      wireGeo.setAttribute("position", new T.Float32BufferAttribute(wpts, 3));
      const wire = new T.Line(wireGeo, new T.LineBasicMaterial({ color: 0x2a2224 })); scene.add(wire); scene.userData.wire = wire;
      const isle = (houses) => {
        const b = Builder();
        b.add(new T.CylinderGeometry(3.4, 4.2, 0.6, 18), M(0, 0, 0), "#5E7A4E");
        if (houses) {
          b.add(new T.BoxGeometry(1.6, 1.2, 1.3), M(-0.6, 0.9, 0), "#E6D8BE");
          b.add(new T.CylinderGeometry(0.95, 0.95, 1.9, 3, 1, false, Math.PI / 2), M(-0.6, 1.75, 0, 0, 0, Math.PI / 2), "#8E3C33");
          b.add(new T.BoxGeometry(0.22, 0.3, 0.02), M(-0.3, 0.95, 0.66), "#FFD58A", 1);
        }
        for (let k = 0; k < 4; k++) b.add(new T.IcosahedronGeometry(0.7 + r() * 0.6, 1), M(1.2 + r() * 1.4, 1.2 + r() * 0.8, (r() - 0.5) * 1.6), k % 2 ? "#3E5E3E" : "#4E6E46");
        return b.build();
      };
      [[0.12, -34, true], [0.45, -52, false], [0.7, -28, true], [0.92, -60, false]].forEach(([f, z, h]) => {
        const m = new T.Mesh(isle(h), mat); m.position.set(0, -0.25, z); scene.add(m); movers.push({ m, base: f * L, z, par: z < -50 ? 0.55 : 0.75 });
      });
      {
        const b = Builder();
        b.add(new T.BoxGeometry(14, 0.5, 3), M(0, 0.1, 0), "#7E7470");
        b.add(new T.BoxGeometry(4, 2.4, 2.4), M(2, 1.5, 0), "#D8C6A8");
        b.add(new T.CylinderGeometry(1.8, 1.8, 4.6, 3, 1, false, Math.PI / 2), M(2, 3.2, 0, 0, 0, Math.PI / 2), "#4E5A66");
        b.add(new T.BoxGeometry(0.4, 0.5, 0.02), M(1.2, 1.6, 1.21), "#FFD58A", 1);
        b.add(new T.BoxGeometry(0.4, 0.5, 0.02), M(2.8, 1.6, 1.21), "#FFD58A", 1);
        for (const x of [-5, -2, 1, 4]) b.add(new T.CylinderGeometry(0.06, 0.06, 2.4, 6), M(x, 1.5, -1.2), "#3A3030");
        const m = new T.Mesh(b.build(), mat); m.position.set(0, -0.3, -22); scene.add(m); movers.push({ m, base: 0.3 * L, z: -22, par: 0.85 });
      }
      // colinas distantes (quase paradas)
      {
        const b = Builder();
        for (let k = 0; k < 10; k++) b.add(new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(-300 + k * 66, -1, -260 - (k % 3) * 40, 0, 0, 0, 70, 16 + (k % 3) * 8, 30), k % 2 ? "#8E7C96" : "#9A86A0");
        scene.add(new T.Mesh(b.build(), mat));
      }

      // as lembranças: fotos em molduras flutuando sobre a água
      const loader = new T.TextureLoader();
      MEMS.forEach((mm, i) => {
        const g = new T.Group();
        const tex = loader.load(BASE + mm.src, (t) => {
          const a = t.image.width / t.image.height;
          const h = a < 1 ? 2.6 : 1.9, w = h * a;
          photo.scale.set(w, h, 1); frame.scale.set(w + 0.22, h + 0.22, 1); glowM.scale.set(w + 0.9, h + 0.9, 1);
        });
        const photo = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: tex })); photo.position.z = 0.02;
        const frame = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: 0xe8d9b8 }));
        const glowM = new T.Mesh(new T.PlaneGeometry(1, 1), new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uOn: { value: 0 } },
          vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
          fragmentShader: `uniform float uOn; varying vec2 vUv; void main(){ vec2 q=abs(vUv-0.5)*2.0; float d=max(q.x,q.y); float g=smoothstep(1.0,0.75,d)*(0.18+uOn*0.5); gl_FragColor=vec4(vec3(1.0,0.85,0.6)*g,g); }` }));
        glowM.position.z = -0.02;
        g.add(glowM, frame, photo);
        g.position.set(0, 1.6, -7.2);
        scene.add(g);
        const item = { m: g, base: i * (L / MEMS.length) + 8, z: -7.2, photo, glowM, i };
        photo.userData.i = i;
        movers.push(item); photos.push(item);
      });

      env.uPL.value[0].set(-4.8, 2.3, 0); env.uPLC.value[0].set("#C98A50"); env.uPLR.value[0] = 2.0;
      env.uPL.value[1].set(0, 2.3, 0); env.uPLC.value[1].set("#C98A50"); env.uPLR.value[1] = 2.0;
      env.uPL.value[2].set(4.8, 2.3, 0); env.uPLC.value[2].set("#C98A50"); env.uPLR.value[2] = 2.0;
    }

    // som dos trilhos: batidas duplas e um ronco grave
    function startSound() {
      try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        if (audio.state === "suspended") audio.resume();
        const ctx = audio;
        const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = nb.getChannelData(0);
        let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
        const src = ctx.createBufferSource(); src.buffer = nb; src.loop = true;
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 220;
        const g = ctx.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 1.5);
        src.connect(lp); lp.connect(g); g.connect(ctx.destination); src.start();
        rumble = { src, g };
        const click = (when, amp) => {
          const b = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.05), ctx.sampleRate), dd = b.getChannelData(0);
          for (let i = 0; i < dd.length; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / dd.length, 4);
          const s = ctx.createBufferSource(); s.buffer = b;
          const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 520; f.Q.value = 1.2;
          const gg = ctx.createGain(); gg.gain.value = amp; s.connect(f); f.connect(gg); gg.connect(ctx.destination); s.start(when);
        };
        const tick = () => {
          if (speed > 0.3) { const now = ctx.currentTime; click(now, 0.5 * speed / SPEED0); click(now + 0.13, 0.38 * speed / SPEED0); }
          clackTimer = setTimeout(tick, Math.max(380, 4200 / Math.max(speed, 0.4)));
        };
        tick();
      } catch (e) { /* sem áudio */ }
    }
    function stopSound() {
      clearTimeout(clackTimer); clackTimer = null;
      if (rumble && audio) { try { rumble.g.gain.linearRampToValueAtTime(0, audio.currentTime + 0.5); rumble.src.stop(audio.currentTime + 0.6); } catch (e) { /* já parado */ } }
      rumble = null;
    }

    function showMem(i) {
      open = i; target = 0.25;
      const mm = MEMS[i];
      const pals = ["sunset", "sakura", "gold", "lavender", "sky"];
      $("dossierBody").innerHTML = MEMS.map((m, n) => `<section class="kc kc-photo" data-c="${pals[n % pals.length]}" data-k="憶"><span class="kc-kicker">Lembrança ${n + 1} · ${esc(m.tag)}</span><h2>${esc(m.t)}</h2><img class="kc-img" src="${esc(BASE + m.src)}" alt="${esc(m.t)}" loading="lazy"><p>${esc(m.d)}</p></section>`).join("");
      $("dossierBody").dataset.start = i;
      void mm;
      showDossier();
      hint.textContent = "";
    }
    function pick(e) {
      const rc = canvas.getBoundingClientRect();
      ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const h = ray.intersectObjects(photos.map((p) => p.photo))[0];
      return h ? h.object.userData.i : null;
    }
    const onMove = (e) => { if (e.target !== canvas || final) return; hovered = pick(e); canvas.style.cursor = hovered !== null ? "pointer" : ""; };
    const onClick = (e) => { if (e.target !== canvas || final) return; const i = pick(e); if (i !== null) showMem(i); };

    // o último trem: a viagem que não volta, com a frase na tela
    const FRASE = ["O momento mais jovem da sua vida é agora.", "Aproveite, porque passa."];
    function buildFim() {
      fimEl = document.createElement("div"); fimEl.className = "fim"; fimEl.setAttribute("role", "dialog"); fimEl.setAttribute("aria-label", "O último trem");
      // letra por letra, mas cada palavra inteira numa linha só (a quebra acontece entre palavras)
      const letters = (t, d0) => { let i = 0; return t.split(" ").map((w) => `<span class="fim-w">${[...w].map((ch) => `<span style="animation-delay:${(d0 + (i++) * 0.055).toFixed(2)}s">${esc(ch)}</span>`).join("")}</span>`).join(" "); };
      fimEl.innerHTML = `<p class="fim-frase"><span class="fim-l1">${letters(FRASE[0], 2.2)}</span><span class="fim-l2">${letters(FRASE[1], 2.2 + FRASE[0].length * 0.055 + 0.9)}</span></p>
        <p class="fim-assina">A jornada é o que dá forma ao mundo.<small>Fernando Rateke · Portfólio 2026</small></p>
        <p class="fim-dica">Para voltar à capa, é só tocar em qualquer lugar da tela.</p>`;
    }
    const leaveFim = () => { if (!final) return; close(); if (window.vale && window.vale.toCover) window.vale.toCover(); };
    const onFimKey = (e) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") { e.preventDefault(); leaveFim(); } };
    const api = {
      template: "dossierTrem", dossierLabel: "", show: (i) => showMem(i),
      dragonNow() { const dr = scene.userData.dragon; dr.next = 0; },
      startFinal() {
        final = true; if (!fimEl) buildFim();
        el.classList.add("fim-on"); el.appendChild(fimEl); fimEl.classList.remove("show"); void fimEl.offsetWidth; fimEl.classList.add("show");
        photos.forEach((p) => { p.m.visible = false; });
        target = 2.2; speed = 0; UD.value = 0;
        const dr = scene.userData.dragon; dr.t = -1; dr.next = 20;
        setTimeout(() => { if (final) { el.addEventListener("click", leaveFim); addEventListener("keydown", onFimKey); } }, 1200);
      }, at: (i) => { travel = (i * (L / MEMS.length) + 8 - L / 2 + L * 10) % L; },
      titleHTML: `<span class="w-kicker">Sobre o lago</span><span class="w-name">Trem sobre a água</span>`,
      hintText: "Toque numa lembrança quando ela passar pela janela.",
      build,
      start() {
        time = 0; open = null; hovered = null; speed = SPEED0; target = SPEED0;
        canvas.addEventListener("click", onClick); canvas.addEventListener("pointermove", onMove);
        $("worldAction").hidden = true;
        api.onDossierClose = () => { open = null; target = SPEED0; hint.textContent = "Toque numa lembrança quando ela passar pela janela."; };
        startSound();
      },
      stop() {
        canvas.removeEventListener("click", onClick); canvas.removeEventListener("pointermove", onMove); canvas.style.cursor = ""; stopSound();
        if (final) { final = false; el.classList.remove("fim-on"); el.removeEventListener("click", leaveFim); removeEventListener("keydown", onFimKey); if (fimEl && fimEl.parentNode) fimEl.parentNode.removeChild(fimEl); photos.forEach((p) => { p.m.visible = true; }); UD.value = 0; scene.userData.dragon.g.visible = false; }
      },
      resize(w, h) { camera.aspect = w / h; camera.fov = w / h < 0.9 ? 78 : 58; camera.updateProjectionMatrix(); },
      update(dt) {
        time += dt;
        speed += (target - speed) * Math.min(1, dt * 1.2);
        travel += speed * dt;
        scene.userData.water.material.uniforms.uTravel.value = travel;
        scene.userData.water.material.uniforms.uTime.value = time;
        movers.forEach((o) => {
          const x = wrap(o.base - travel * (o.par || 1));
          o.m.position.x = x;
          if (o.photo) o.m.position.y = 1.6 + Math.sin(time * 0.8 + o.i) * 0.06;
        });
        scene.userData.wire.position.x = -(travel % (L / 14));
        if (final) {
          UD.value = Math.min(1, UD.value + dt / 40);
          const dr = scene.userData.dragon;
          if (dr.t < 0) { dr.next -= dt; if (dr.next <= 0) { dr.t = 0; dr.g.visible = true; } }
          else {
            dr.t += dt;
            const at = (u) => new T.Vector3(-120 + u * 18, 30 + Math.sin(u * 1.7) * 5, -170 + Math.sin(u * 0.6) * 16);
            const u0 = dr.t;
            let prev = at(u0);
            dr.head.position.copy(prev); dr.head.lookAt(at(u0 + 0.05)); dr.head.rotateY(Math.PI / 2);
            dr.segs.forEach((sg, i) => {
              const p = at(u0 - (i + 1) * 0.085); p.y += Math.sin(time * 3 - i * 0.45) * 1.4;
              sg.m.position.copy(p);
              if (sg.mane) { sg.mane.position.copy(p).add(new T.Vector3(0, sg.r * 1.1, 0)); sg.mane.rotation.z = Math.sin(time * 4 - i) * 0.3 - 0.4; }
              prev = p;
            });
            if (dr.t > 15.5) { dr.t = -1; dr.g.visible = false; dr.next = 55 + Math.random() * 30; }
          }
        }
        photos.forEach((p) => { const on = hovered === p.i || open === p.i ? 1 : 0; p.glowM.material.uniforms.uOn.value += (on - p.glowM.material.uniforms.uOn.value) * Math.min(1, dt * 6); });
        // balanço do vagão
        const bump = Math.sin(time * 7.3) * 0.006 * speed / SPEED0 + Math.sin(time * 1.3) * 0.004;
        camera.position.set(0.0 + pointer.sx * 0.35, 1.42 + bump, 0.55);
        camera.lookAt(pointer.sx * 1.6, 1.66 - pointer.sy * 0.35, -6);
        camera.rotation.z += Math.sin(time * 0.9) * 0.004;
        scene.userData.sky.position.copy(camera.position);
      },
      render(rr) { rr.setRenderTarget(null); rr.render(scene, camera); },
    };
    return api;
  })();

  /* =================================================================== */
  /* O QUARTO (alto do castelo): quem eu sou, com o Calcifer na lareira    */
  /* =================================================================== */
  const quarto = (() => {
    const scene = new T.Scene();
    scene.background = new T.Color("#120C0A");
    const camera = new T.PerspectiveCamera(54, 1, 0.1, 200);
    const env = envUniforms({ sun: [0.15, 0.55, -0.82], sunCol: "#E8B884", amb: "#3E2E28", fog: "#120C0A", fogDen: 0.012, glowCol: "#FFC27A" });
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const BASE = window.VALE_BASE || "";
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    let time = 0, hovered = null, selected = null, hits = [], calc = null, lights = [], tip, camFrom = null, camK = 1, timer = null, sayUntil = 0, beamMat, motes;
    const look = { yaw: 0, pitch: 0, ty: 0, tp: 0, drag: null, moved: 0 };
    const HX = -4.3, HZ = -3.75, DX = 5.25;
    const SPOTS = {
      espelho: { name: "Espelho", sub: "quem sou", view: { pos: [-2.2, 1.75, 2.9], tgt: [-4.7, 1.55, 2.0] }, say: "Esse aí no espelho é o Fernando. Quer saber quem ele é?" },
      estante: { name: "Estante", sub: "conquistas", view: { pos: [-2.4, 1.9, 0.8], tgt: [-5.8, 1.6, -0.4] }, say: "Troféu, medalhas, credenciais. Cuidado que o troféu é de acrílico." },
      mural: { name: "Mural", sub: "a jornada", view: { pos: [2.6, 2.0, 0.8], tgt: [3.2, 2.2, -4.6] }, say: "As feiras e a Iniciação Científica, presas com tachinha." },
      mesa: { name: "Escrivaninha", sub: "currículo e habilidades", view: { pos: [2.4, 2.1, 2.2], tgt: [5.6, 1.3, 0.6] }, say: "A mesa de trabalho. O currículo está em cima do notebook." },
      calcifer: { name: "Calcifer", sub: "o guia", view: { pos: [-2.5, 1.4, -0.6], tgt: [-4.2, 0.75, -3.9] }, say: "Eu cuido do fogo do castelo. E deste quarto, já que alguém precisa." },
    };
    const IDLE = { pos: [0.4, 2.2, 3.9], tgt: [-0.6, 1.6, -2.0] };
    const talking = () => performance.now() < sayUntil;
    function say(t) { sayUntil = performance.now() + Math.min(3400, 900 + t.length * 45); line.textContent = t; line.classList.remove("show"); void line.offsetWidth; line.classList.add("show"); }
    function tex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.anisotropy = 4; return t; }
    const loader = new T.TextureLoader();
    const photoMat = (src) => new T.MeshBasicMaterial({ map: loader.load(BASE + src), color: 0xf2e6d4 });

    // cartões montados a partir do perfil (uma fonte só)
    const $q = (sel) => document.querySelector(sel);
    function cards(id) {
      const out = [];
      if (id === "espelho") {
        const img = $q(".perfil .portrait img"), stats = [...document.querySelectorAll(".perfil .stats dt")].map((dt) => `<li><b>${esc(dt.textContent)}</b> ${esc(dt.nextElementSibling.textContent)}</li>`).join("");
        out.push(`<section class="kc kc-photo" data-c="sky" data-k="私"><span class="kc-kicker">Quem sou</span><h2>${esc($q("#perfilNome").textContent)}</h2><img class="kc-img" src="${img ? img.src : ""}" alt="Retrato de Fernando Rateke"><ul class="kc-facts">${stats}</ul></section>`);
        out.push(`<section class="kc" data-c="sakura" data-k="道"><span class="kc-kicker">Um pouco mais</span><h2>De onde eu venho</h2>${[...document.querySelectorAll(".perfil .bio p")].map((p) => `<p>${esc(p.textContent)}</p>`).join("")}</section>`);
        const quest = $q(".perfil .quest p");
        out.push(`<section class="kc" data-c="gold" data-k="志"><span class="kc-kicker">Missão principal</span><h2>Para onde eu vou</h2><p>${esc(quest ? quest.textContent : "")}</p></section>`);
      }
      if (id === "estante") {
        document.querySelectorAll("#pn-ach .ach").forEach((a, i) => {
          const img = a.querySelector("img"), h = a.querySelector("h3"), p = a.querySelector("p"), st = a.querySelector(".stamp");
          out.push(`<section class="kc kc-photo" data-c="${["gold", "sunset", "sakura", "lavender", "matcha", "sky"][i % 6]}" data-k="賞"><span class="kc-kicker">${esc(st ? st.textContent : "Conquista")}</span><h2>${esc(h.textContent)}</h2>${img ? `<img class="kc-img" src="${img.src}" alt="${esc(img.alt)}">` : ""}<p>${esc(p.textContent)}</p></section>`);
        });
      }
      if (id === "mural") {
        [["trem/ic-2026.jpg", "Iniciação Científica", "A seleção da IC 2026", "Pesquisa e desenvolvimento em equipe. Foi daqui que o AcousticBuild saiu para as feiras."],
         ["trem/febrace-2026.jpg", "FEBRACE 2026", "Rumo a São Paulo", "A equipe reunida no aeroporto de Florianópolis, antes de apresentar na Feira Brasileira de Ciências e Engenharia."],
         ["trem/dual.jpg", "DUAL International Fair", "Dois anos seguidos", "Apresentação do projeto numa feira científica internacional, em 2025 e em 2026."],
         ["trem/febic-palco.jpg", "XI FEBIC · Joinville", "O 2º lugar", "Segundo lugar em Ciências Exatas e da Terra, com credencial para a FoCiTeCu 2027, na Argentina."],
         ["trem/tias.jpg", "Gratidão", "Quem veio junto", "Com as minhas tias, a quem devo um agradecimento enorme por tudo."]]
          .forEach(([src, k, h, p], i) => out.push(`<section class="kc kc-photo" data-c="${["sunset", "sky", "lavender", "gold", "sakura"][i]}" data-k="旅"><span class="kc-kicker">${esc(k)}</span><h2>${esc(h)}</h2><img class="kc-img" src="${BASE + src}" alt="${esc(h)}"><p>${esc(p)}</p></section>`));
      }
      if (id === "mesa") {
        document.querySelectorAll("#pn-attr .attr").forEach((a, i) => {
          const k = a.querySelector(".k"), h = a.querySelector("h3"), tech = a.querySelector(".tech"), lis = [...a.querySelectorAll("li")].map((li) => `<div class="kc-box"><b>${esc(li.childNodes[0].textContent.trim())}</b><small>${esc((li.querySelector("em") || {}).textContent || "")}</small></div>`).join("");
          out.push(`<section class="kc" data-c="${["lavender", "matcha", "sky", "sunset"][i % 4]}" data-k="${esc(k ? k.textContent : "力")}"><span class="kc-kicker">Atributo</span><h2>${esc(h.textContent)}</h2><p>${esc(tech ? tech.textContent : "")}</p><div class="kc-cols">${lis}</div></section>`);
        });
        const inv = [...document.querySelectorAll("#pn-inv .inv > div")].map((d) => `<span>${esc(d.querySelector("span").textContent)}</span>`).join("");
        out.push(`<section class="kc" data-c="gold" data-k="具"><span class="kc-kicker">Inventário</span><h2>As ferramentas da mochila</h2><div class="chips">${inv}</div></section>`);
        const links = [...document.querySelectorAll(".perfil .links a")].map((a) => `<li><a href="${a.href}" target="_blank" rel="noreferrer">${esc(a.textContent)}</a></li>`).join("");
        out.push(`<section class="kc" data-c="sakura" data-k="連"><span class="kc-kicker">Contato</span><h2>Vamos conversar</h2><p>${esc(($q("#perfilMail") || {}).textContent || "")}</p><ul class="kc-links">${links}</ul></section>`);
      }
      if (id === "calcifer") {
        out.push(`<section class="kc" data-c="sunset" data-k="火"><span class="kc-kicker">O quarto</span><h2>Quem mora aqui</h2><p>Cada canto guarda uma parte do Fernando.</p><ol class="kc-toc">${["espelho", "estante", "mural", "mesa"].map((s, n) => `<li><button type="button" data-spot="${s}"><i>${String(n + 1).padStart(2, "0")}</i><b>${SPOTS[s].name}</b><small>${SPOTS[s].sub}</small></button></li>`).join("")}</ol></section>`);
      }
      return out.join("");
    }

    function build() {
      const mat = toon(env);
      const B = Builder(); const r = mulberry(12);
      const WOOD = "#6A4630", WOOD_D = "#3A2618", PLASTER = "#E2CCA8";
      // assoalho de tábuas com veios
      for (let x = -6; x < 6; x += 0.42) B.add(new T.BoxGeometry(0.41, 0.06, 8.8), M(x + 0.21, 0, -0.3), (px, py, pz) => (Math.sin((pz + x * 7) * 3.1) > 0.75 ? "#5E3E28" : ((x * 10) | 0) % 3 === 0 ? "#7A5236" : "#6E4A30"));
      // tapete redondo com bordas
      for (const [rr, c] of [[2.6, "#7A2A26"], [2.35, "#C9A24A"], [2.2, "#8A3A2E"], [1.5, "#3E5A58"], [1.35, "#C9A24A"], [1.2, "#8A3A2E"]]) B.add(new T.CylinderGeometry(rr, rr, 0.02, 48), M(0, 0.04 + (2.6 - rr) * 0.004, 0.6), c);
      // paredes, vigas e telhado inclinado
      const back = new T.Shape([new T.Vector2(-6, 0), new T.Vector2(6, 0), new T.Vector2(6, 3.2), new T.Vector2(0, 5.6), new T.Vector2(-6, 3.2)]);
      const hole = new T.Path(); hole.absarc(0, 2.75, 1.15, 0, Math.PI * 2, true); back.holes.push(hole);
      B.add(new T.ShapeGeometry(back, 24), M(0, 0, -4.5), PLASTER);
      for (const s of [-1, 1]) {
        B.add(new T.BoxGeometry(0.12, 3.2, 8.6), M(s * 6, 1.6, -0.2), PLASTER);
        B.add(new T.BoxGeometry(6.6, 0.12, 8.8), M(s * 3, 4.42, -0.2, 0, 0, -s * 0.3805), "#7A5438");
        for (let z = -4.2; z <= 4; z += 1.4) B.add(new T.BoxGeometry(6.6, 0.18, 0.16), M(s * 3, 4.3, z, 0, 0, -s * 0.3805), WOOD_D);
        for (const y of [0.12, 3.12]) B.add(new T.BoxGeometry(0.14, 0.16, 8.6), M(s * 5.94, y, -0.2), WOOD_D);
        for (let z = -4.4; z <= 4; z += 2.1) B.add(new T.BoxGeometry(0.14, 3.2, 0.18), M(s * 5.92, 1.6, z), WOOD_D);
      }
      B.add(new T.BoxGeometry(0.24, 0.26, 8.8), M(0, 5.52, -0.2), WOOD_D);
      for (const x of [-4.4, -2.2, 2.2, 4.4]) B.add(new T.BoxGeometry(0.16, 3.2, 0.14), M(x, 1.6, -4.44), WOOD_D);
      B.add(new T.BoxGeometry(12, 0.16, 0.14), M(0, 0.1, -4.44), WOOD_D);
      B.add(new T.TorusGeometry(1.17, 0.11, 8, 48), M(0, 2.75, -4.42), WOOD_D);
      B.add(new T.BoxGeometry(0.07, 2.3, 0.07), M(0, 2.75, -4.44), WOOD_D);
      B.add(new T.BoxGeometry(2.3, 0.07, 0.07), M(0, 2.75, -4.44), WOOD_D);
      B.add(new T.BoxGeometry(2.0, 0.1, 0.36), M(0, 1.55, -4.32), WOOD);
      // planta no parapeito
      B.add(new T.CylinderGeometry(0.16, 0.12, 0.26, 12), M(-0.6, 1.73, -4.3), "#A0583A");
      for (let k = 0; k < 7; k++) B.add(new T.SphereGeometry(0.12, 8, 6), M(-0.6 + Math.cos(k) * 0.12, 1.95 + (k % 3) * 0.08, -4.3 + Math.sin(k) * 0.1, 0, 0, 0, 1, 1.4, 1), "#4E8A3E");
      // lareira de pedra (Calcifer)
      B.add(new T.BoxGeometry(2.0, 0.3, 1.3), M(HX, 0.15, HZ), "#6E6872");
      for (const s of [-1, 1]) B.add(new T.BoxGeometry(0.42, 1.5, 0.9), M(HX + s * 0.78, 1.05, HZ - 0.15), (x, y) => (Math.floor(y * 4) % 2 ? "#7A6E66" : "#857A70"));
      B.add(new T.BoxGeometry(2.0, 0.5, 0.95), M(HX, 2.05, HZ - 0.15), "#7A6E66");
      B.add(new T.BoxGeometry(1.2, 2.4, 0.8), M(HX, 3.5, HZ - 0.3), "#6E6466");
      B.add(new T.BoxGeometry(1.2, 1.3, 0.1), M(HX, 0.95, HZ - 0.55), "#1C1412");
      B.add(new T.BoxGeometry(2.2, 0.12, 1.1), M(HX, 2.36, HZ - 0.1), WOOD);
      // estante de troféus (parede esquerda)
      const SX = -5.62;
      B.add(new T.BoxGeometry(0.06, 2.4, 3.2), M(SX - 0.22, 1.2, -0.3), WOOD_D);
      for (const z of [-1.9, 1.3]) B.add(new T.BoxGeometry(0.52, 2.4, 0.06), M(SX + 0.02, 1.2, z), WOOD);
      for (let sI = 0; sI < 4; sI++) B.add(new T.BoxGeometry(0.52, 0.06, 3.2), M(SX + 0.02, 0.06 + sI * 0.78, -0.3), WOOD_D);
      // troféu da FEBIC: base preta e placa de acrílico colorida
      B.add(new T.BoxGeometry(0.3, 0.12, 0.36), M(SX + 0.04, 1.62, -0.3), "#1C1A1E");
      const trophyTex = tex(128, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#6E7CE8"); gr.addColorStop(0.5, "#C77CE0"); gr.addColorStop(1, "#4E8CE8"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "#FFFFFF"; g.font = "800 34px sans-serif"; g.textAlign = "center"; g.fillText("FEBIC", w / 2, h * 0.62); g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.arc(w / 2, h * 0.3, 26, 0, Math.PI * 2); g.fill(); });
      const trophy = new T.Mesh(new T.PlaneGeometry(0.3, 0.62), new T.MeshBasicMaterial({ map: trophyTex })); trophy.position.set(SX + 0.06, 2.0, -0.3); trophy.rotation.y = Math.PI / 2; scene.add(trophy);
      // medalhas penduradas na prateleira
      for (const [z, c] of [[-1.3, "#D4D8DE"], [-0.95, "#E0B84A"], [0.4, "#D4D8DE"], [0.75, "#C98A4A"]]) {
        B.add(new T.BoxGeometry(0.02, 0.5, 0.06), M(SX + 0.28, 1.95, z - 0.05, 0.25, 0, 0), "#3E6AC0"); B.add(new T.BoxGeometry(0.02, 0.5, 0.06), M(SX + 0.28, 1.95, z + 0.05, -0.25, 0, 0), "#3E6AC0");
        B.add(new T.CylinderGeometry(0.11, 0.11, 0.03, 18), M(SX + 0.29, 1.66, z, 0, 0, Math.PI / 2), c, 0.25);
      }
      // crachás, livros e caixas nas outras prateleiras
      for (let k = 0; k < 9; k++) B.add(new T.BoxGeometry(0.34, 0.5 + r() * 0.12, 0.09 + r() * 0.03), M(SX + 0.06, 0.4, -1.7 + k * 0.12), ["#2E4A6E", "#7A2A26", "#3E5A3A", "#C9A24A"][k % 4]);
      for (const z of [0.2, 0.6, 1.0]) B.add(new T.BoxGeometry(0.04, 0.32, 0.22), M(SX + 0.2, 1.06, z, 0, 0, -0.1), "#F4F0E2");
      B.add(new T.BoxGeometry(0.4, 0.26, 0.4), M(SX + 0.05, 2.5, 0.6), "#8A6A44");
      // certificados emoldurados na parede, acima da estante
      for (const z of [-1.0, 0.4]) { B.add(new T.BoxGeometry(0.06, 0.62, 0.86), M(-5.9, 2.85, z), WOOD_D); B.add(new T.BoxGeometry(0.07, 0.52, 0.76), M(-5.89, 2.85, z), "#F4EEDC"); }
      // escrivaninha, notebook e currículo
      B.add(new T.BoxGeometry(1.0, 0.08, 2.6), M(DX, 1.0, 0.4), WOOD);
      for (const z of [-0.8, 1.6]) B.add(new T.BoxGeometry(0.9, 0.96, 0.06), M(DX, 0.5, z), WOOD_D);
      B.add(new T.BoxGeometry(0.5, 0.03, 0.7), M(DX - 0.1, 1.06, 0.3), "#3A3C44");
      B.add(new T.BoxGeometry(0.03, 0.42, 0.7), M(DX + 0.14, 1.27, 0.3, 0, 0, -0.25), "#3A3C44");
      B.add(new T.BoxGeometry(0.3, 0.012, 0.22), M(DX - 0.2, 1.05, 1.15, 0, 0.2, 0), "#F7F4EA");
      B.add(new T.BoxGeometry(0.3, 0.012, 0.22), M(DX - 0.22, 1.062, 1.18, 0, -0.1, 0), "#F2EEDF");
      B.add(new T.CylinderGeometry(0.07, 0.06, 0.12, 12), M(DX - 0.3, 1.1, -0.45), "#E8DCC2");
      B.add(new T.CylinderGeometry(0.03, 0.05, 0.6, 8), M(DX + 0.2, 1.34, -0.55), "#2E2C30");
      B.add(new T.ConeGeometry(0.18, 0.18, 12, 1, true), M(DX + 0.05, 1.62, -0.5, 0, 0, 0.6), "#C9A24A");
      B.add(new T.BoxGeometry(0.6, 0.07, 0.6), M(DX - 1.05, 0.62, -0.25, 0, 0.5, 0), "#7A2A26");
      B.add(new T.BoxGeometry(0.07, 0.7, 0.6), M(DX - 0.8, 1.0, -0.4, 0, 0.5, 0), "#7A2A26");
      // cama baixa com cabeceira, colcha e travesseiro (fundo à direita)
      B.add(new T.BoxGeometry(2.3, 0.36, 1.5), M(3.2, 0.18, -3.6), WOOD);
      B.add(new T.BoxGeometry(2.3, 0.9, 0.12), M(3.2, 0.6, -4.33), WOOD_D);
      B.add(new T.BoxGeometry(2.2, 0.2, 1.4), M(3.2, 0.46, -3.6), "#F0E6D2");
      B.add(new T.BoxGeometry(1.6, 0.22, 1.42, 6, 1, 1), M(3.5, 0.5, -3.55), (x) => (Math.floor((x + 1) * 4) % 2 ? "#3E5A8A" : "#4E6A9A"));
      B.add(new T.SphereGeometry(1, 14, 10), M(2.35, 0.64, -3.6, 0, 0, 0, 0.32, 0.12, 0.5), "#FFFFFF");
      scene.add(new T.Mesh(B.build(), mat));

      // o espelho com o retrato
      const mir = new T.Group(); mir.position.set(-4.7, 0, 2.0); mir.rotation.y = 1.15; scene.add(mir);
      const MB = Builder();
      MB.add(new T.TorusGeometry(0.62, 0.07, 8, 40), M(0, 1.55, 0, 0, 0, 0, 0.78, 1.25, 1), "#B8913E");
      MB.add(new T.CylinderGeometry(0.04, 0.05, 1.0, 8), M(-0.36, 0.5, -0.1, 0.1, 0, 0.08), WOOD_D);
      MB.add(new T.CylinderGeometry(0.04, 0.05, 1.0, 8), M(0.36, 0.5, -0.1, 0.1, 0, -0.08), WOOD_D);
      MB.add(new T.BoxGeometry(0.9, 0.06, 0.36), M(0, 0.03, -0.05), WOOD_D);
      mir.add(new T.Mesh(MB.build(), mat));
      const glass = new T.Mesh(new T.CircleGeometry(0.6, 40), photoMat("perfil/retrato.jpg")); glass.scale.set(0.78, 1.25, 1); glass.position.set(0, 1.55, 0.01); mir.add(glass);
      // mural de cortiça com as fotos, acima da cama
      const cork = tex(256, 160, (g, w, h) => { g.fillStyle = "#B88A5A"; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${90 + Math.random() * 60},${60 + Math.random() * 40},30,0.35)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
      const board = new T.Mesh(new T.PlaneGeometry(2.4, 1.5), new T.MeshBasicMaterial({ map: cork, color: 0xd9c0a0 })); board.position.set(3.2, 2.2, -4.42); scene.add(board);
      const frameB = Builder(); for (const [x, y, w, h] of [[3.2, 2.97, 2.5, 0.06], [3.2, 1.43, 2.5, 0.06], [1.97, 2.2, 0.06, 1.6], [4.43, 2.2, 0.06, 1.6]]) frameB.add(new T.BoxGeometry(w, h, 0.06), M(x, y, -4.41), WOOD_D);
      scene.add(new T.Mesh(frameB.build(), mat));
      [["trem/ic-2026.jpg", 2.45, 2.45, -0.08], ["trem/febrace-2026.jpg", 3.2, 2.55, 0.05], ["trem/dual.jpg", 3.95, 2.4, -0.04], ["trem/febic-palco.jpg", 2.75, 1.85, 0.06], ["trem/tias.jpg", 3.7, 1.82, -0.07]].forEach(([src, x, y, rz]) => {
        const ph = new T.Mesh(new T.PlaneGeometry(0.62, 0.46), photoMat(src)); ph.position.set(x, y, -4.39); ph.rotation.z = rz; scene.add(ph);
        const pin = new T.Mesh(new T.SphereGeometry(0.03, 8, 6), new T.MeshBasicMaterial({ color: 0xc22026 })); pin.position.set(x, y + 0.2, -4.37); scene.add(pin);
      });
      // vista pela janela
      const view = tex(512, 512, (g, w, h) => {
        const sky = g.createLinearGradient(0, 0, 0, h * 0.62); sky.addColorStop(0, "#6F8FC6"); sky.addColorStop(0.6, "#E9B79A"); sky.addColorStop(1, "#F6D7A8");
        g.fillStyle = sky; g.fillRect(0, 0, w, h);
        g.fillStyle = "#8C9AB4"; g.beginPath(); g.moveTo(40, 330); g.lineTo(190, 190); g.lineTo(330, 330); g.fill();
        g.fillStyle = "#F4F1EC"; g.beginPath(); g.moveTo(150, 228); g.lineTo(190, 190); g.lineTo(230, 228); g.fill();
        g.fillStyle = "#7FA864"; g.fillRect(0, 318, w, h); g.fillStyle = "#5E93B4"; g.beginPath(); g.ellipse(300, 372, 190, 16, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#C22026"; g.fillRect(286, 340, 4, 22); g.fillRect(304, 340, 4, 22); g.fillRect(280, 338, 34, 4);
      });
      const vm = new T.Mesh(new T.PlaneGeometry(3.4, 3.4), new T.MeshBasicMaterial({ map: view })); vm.position.set(0, 2.75, -4.62); scene.add(vm);
      // feixe de luz da janela, com poeira dourada
      beamMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: { uT: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `uniform float uT; varying vec2 vUv; void main(){ float e=smoothstep(0.0,0.35,vUv.x)*smoothstep(1.0,0.65,vUv.x); float a=e*smoothstep(0.0,0.5,vUv.y)*0.16*(0.85+0.15*sin(uT*0.7)); gl_FragColor=vec4(vec3(1.0,0.86,0.6)*a,a); }` });
      const beam = new T.Mesh(new T.PlaneGeometry(2.0, 6.0), beamMat); beam.position.set(0.3, 1.3, -1.6); beam.rotation.set(-1.05, 0.15, 0); scene.add(beam);
      const dg = new T.BufferGeometry(), dp = []; for (let i = 0; i < 140; i++) dp.push((r() - 0.5) * 2.4, 0.3 + r() * 3, -3.8 + r() * 4.4);
      dg.setAttribute("position", new T.Float32BufferAttribute(dp, 3));
      motes = new T.Points(dg, new T.PointsMaterial({ color: 0xffe2a8, size: 0.03, transparent: true, opacity: 0.7, depthWrite: false })); scene.add(motes);
      // cordão de luzinhas no teto
      const lightM = new T.MeshBasicMaterial({ color: 0xffd58a });
      for (let i = 0; i <= 18; i++) { const k = i / 18, x = -5 + k * 10, y = 4.0 - Math.sin(k * Math.PI) * 0.6 - Math.abs(x) * 0.1; const b = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), lightM.clone()); b.position.set(x, y, -1.2 + Math.sin(k * 6) * 0.3); scene.add(b); lights.push(b); }
      // Calcifer
      const cal = new T.Group(); cal.position.set(HX, 0.32, HZ - 0.15); scene.add(cal);
      const logs = Builder();
      logs.add(new T.CylinderGeometry(0.09, 0.09, 0.8, 8), M(0, 0.06, 0, 0, 0.5, Math.PI / 2), "#4A3020");
      logs.add(new T.CylinderGeometry(0.09, 0.09, 0.8, 8), M(0, 0.06, 0.05, 0, -0.5, Math.PI / 2), "#5A3B26");
      cal.add(new T.Mesh(logs.build(), mat));
      calc = makeCalcifer(0.82); calc.group.position.y = 0.02; cal.add(calc.group);
      // áreas de toque
      const hitBox = (id, size, pos, ry = 0) => { const m = new T.Mesh(new T.BoxGeometry(...size), new T.MeshBasicMaterial()); m.visible = false; m.position.set(...pos); m.rotation.y = ry; m.userData.spot = id; scene.add(m); hits.push(m); };
      hitBox("espelho", [1.2, 2.2, 0.5], [-4.7, 1.2, 2.0], 1.15);
      hitBox("estante", [0.8, 3.4, 3.4], [SX, 1.6, -0.3]);
      hitBox("mural", [2.6, 1.7, 0.4], [3.2, 2.2, -4.3]);
      hitBox("mesa", [1.4, 1.6, 2.8], [DX, 1.1, 0.4]);
      hitBox("calcifer", [1.3, 1.4, 1.0], [HX, 0.8, HZ]);
      env.uPL.value[0].set(HX, 0.9, HZ + 0.6); env.uPLC.value[0].set("#FF8A3A"); env.uPLR.value[0] = 2.2;
      env.uPL.value[1].set(DX - 0.2, 1.6, -0.4); env.uPLC.value[1].set("#E8B860"); env.uPLR.value[1] = 1.4;
      env.uPL.value[2].set(0, 3.6, -1.2); env.uPLC.value[2].set("#B88A5E"); env.uPLR.value[2] = 3.2;
      tip = document.createElement("div"); tip.className = "w-label"; tip.style.opacity = "0";
    }

    function bindDossier() { $("dossierBody").querySelectorAll("[data-spot]").forEach((b) => b.addEventListener("click", () => select(b.dataset.spot))); }
    function select(id) {
      selected = id; look.ty = 0; look.tp = 0;
      camFrom = { pos: camera.position.clone(), tgt: camera.userData.tgt.clone() }; camK = 0;
      say(SPOTS[id].say);
      $("dossierBody").innerHTML = cards(id); bindDossier();
      hint.textContent = "";
      clearTimeout(timer); timer = setTimeout(() => { if (current === api && selected === id) showDossier(); }, 1400);
    }
    function deselect() {
      selected = null; hint.textContent = api.hintText;
      camFrom = { pos: camera.position.clone(), tgt: camera.userData.tgt.clone() }; camK = 0;
    }
    function pick(e) {
      const rc = canvas.getBoundingClientRect();
      ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const h = ray.intersectObjects(hits)[0];
      return h ? h.object.userData.spot : null;
    }
    // arrastar para olhar em volta
    const onDown = (e) => { if (e.target !== canvas) return; look.drag = { x: e.clientX, y: e.clientY, yaw: look.ty, pitch: look.tp }; look.moved = 0; };
    const onMove = (e) => {
      if (look.drag) { const dx = e.clientX - look.drag.x, dy = e.clientY - look.drag.y; look.moved = Math.max(look.moved, Math.abs(dx) + Math.abs(dy)); look.ty = Math.max(-1.1, Math.min(1.1, look.drag.yaw - dx * 0.004)); look.tp = Math.max(-0.4, Math.min(0.45, look.drag.pitch - dy * 0.003)); canvas.style.cursor = "grabbing"; return; }
      if (e.target !== canvas) return; hovered = pick(e); canvas.style.cursor = hovered ? "pointer" : "grab";
    };
    const onUp = (e) => { const d = look.drag; look.drag = null; if (!d || look.moved > 6 || e.target !== canvas) return; const id = pick(e); if (id) select(id); };

    const api = {
      template: "", dossierLabel: "Ver o quarto", select: (id) => select(id), say: (t) => say(t),
      titleHTML: `<span class="w-kicker">Alto do castelo</span><span class="w-name">O quarto</span>`,
      hintText: "Toque num canto do quarto. Arraste para olhar em volta.",
      build,
      start() {
        time = 0; selected = null; hovered = null; camK = 1; camFrom = null; look.yaw = look.pitch = look.ty = look.tp = 0;
        camera.position.set(...IDLE.pos); camera.userData.tgt = new T.Vector3(...IDLE.tgt);
        labels.appendChild(tip);
        canvas.addEventListener("pointerdown", onDown); addEventListener("pointermove", onMove); addEventListener("pointerup", onUp);
        canvas.style.cursor = "grab";
        $("worldAction").hidden = true;
        $("dossierBody").innerHTML = cards("calcifer"); bindDossier();
        api.dossierReady = true; dossierBtn.hidden = false;
        api.onDossierClose = () => { if (selected) deselect(); $("dossierBody").innerHTML = cards("calcifer"); bindDossier(); };
        clearTimeout(timer); timer = setTimeout(() => { if (current === api && !selected) say("Ah, visita. Este é o quarto do Fernando."); }, 700);
      },
      stop() { clearTimeout(timer); canvas.removeEventListener("pointerdown", onDown); removeEventListener("pointermove", onMove); removeEventListener("pointerup", onUp); canvas.style.cursor = ""; },
      resize(w, h) { camera.aspect = w / h; camera.fov = w / h < 0.9 ? 72 : 54; camera.updateProjectionMatrix(); },
      update(dt) {
        time += dt;
        calc.U.uHot.value += ((hovered === "calcifer" ? 1 : 0) - calc.U.uHot.value) * Math.min(1, dt * 5);
        calc.update(dt, camera, talking());
        env.uPLC.value[0].setRGB(1.0, 0.54 + Math.sin(time * 7) * 0.04, 0.23).multiplyScalar(0.7 + Math.sin(time * 13) * 0.07 + (hovered === "calcifer" ? 0.2 : 0));
        beamMat.uniforms.uT.value = time;
        motes.rotation.y = Math.sin(time * 0.05) * 0.05; motes.position.y = Math.sin(time * 0.3) * 0.08;
        lights.forEach((b, i) => { const k = 0.75 + 0.25 * Math.sin(time * 2 + i * 1.7); b.material.color.setRGB(1.0 * k, 0.84 * k, 0.55 * k); });
        // câmera: posição do canto escolhido + olhar livre ao arrastar
        const dest = selected ? SPOTS[selected].view : IDLE;
        const dp = new T.Vector3(...dest.pos), dtg = new T.Vector3(...dest.tgt);
        if (!selected && !look.drag) { dp.x += pointer.sx * 0.4; dp.y -= pointer.sy * 0.15; }
        camK = Math.min(1, camK + dt / 1.8);
        if (camK < 1 && camFrom) { const e = ease(camK); camera.position.copy(camFrom.pos).lerp(dp, e); camera.userData.tgt.copy(camFrom.tgt).lerp(dtg, e); }
        else { camera.position.lerp(dp, Math.min(1, dt * 3)); camera.userData.tgt.lerp(dtg, Math.min(1, dt * 3)); }
        look.yaw += (look.ty - look.yaw) * Math.min(1, dt * 6); look.pitch += (look.tp - look.pitch) * Math.min(1, dt * 6);
        const dir = camera.userData.tgt.clone().sub(camera.position); const dist = dir.length(); dir.normalize();
        const yaw0 = Math.atan2(dir.x, dir.z) + look.yaw, pitch0 = Math.asin(Math.max(-1, Math.min(1, dir.y))) + look.pitch;
        camera.lookAt(camera.position.clone().add(new T.Vector3(Math.sin(yaw0) * Math.cos(pitch0), Math.sin(pitch0), Math.cos(yaw0) * Math.cos(pitch0)).multiplyScalar(dist)));
        if (hovered && !selected && !look.drag) {
          const s = SPOTS[hovered], hm = hits.find((h) => h.userData.spot === hovered);
          const v = hm.position.clone().add(new T.Vector3(0, 1.0, 0)).project(camera);
          tip.innerHTML = `<b>${esc(s.name)}</b><span>${esc(s.sub)}</span>`;
          tip.style.transform = `translate(-50%, -100%) translate(${(v.x * 0.5 + 0.5) * W}px, ${(-v.y * 0.5 + 0.5) * H}px)`;
          tip.style.opacity = "1";
        } else tip.style.opacity = "0";
      },
      render(rr) { rr.setRenderTarget(null); rr.render(scene, camera); },
    };
    return api;
  })();

  /* =================================================================== */
  /* O CASTELO POR DENTRO: entra-se pela porta dos fundos, sobe-se ao     */
  /* quarto e, na volta, a porta com o seletor leva aos mundos            */
  /* =================================================================== */
  const castelo = (() => {
    const scene = new T.Scene();
    scene.background = new T.Color("#0E0A10");
    const camera = new T.PerspectiveCamera(55, 1, 0.1, 200);
    const env = envUniforms({ sun: [0.3, 0.75, 0.6], sunCol: "#6A5646", amb: "#3A2E2A", fog: "#120C0A", fogDen: 0.014, glowCol: "#FFC27A" });
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    const ROOM_KEY = "castelo-quarto";
    const DOORS = [
      { id: "vermelho", color: "#C22026", name: "Árvore do Totoro", sub: "AcousticBuild", world: "arvore", say: "Vermelho: a árvore do Totoro. É lá que mora o AcousticBuild." },
      { id: "preto", color: "#0B0809", name: "Nós", sub: "o jogo", world: "nos", say: "Preto. Um corredor escuro, e o Nós no fim dele. Vá com calma." },
      { id: "azul", color: "#2E7896", name: "Em breve", sub: "um mundo novo", locked: true, say: "Azul. Essa porta ainda não abre para lugar nenhum. Um dia vai ter outro mundo aqui." },
      { id: "verde", color: "#78AB5A", name: "O vale", sub: "voltar", back: true, say: "Verde: de volta ao vale. O castelo continua andando." },
    ];
    const DX = 1.6, BACKX = -0.6;
    const VIEWS = {
      outside: { pos: [BACKX, 1.75, 8.6], tgt: [BACKX, 1.6, 0] },
      idle: { pos: [-0.6, 2.25, 3.9], tgt: [-1.2, 1.5, -2.2] },
      door: { pos: [1.5, 2.0, 0.4], tgt: [1.6, 2.2, -5] },
      calcifer: { pos: [-2.4, 1.7, -0.3], tgt: [-5.6, 1.1, -1.6] },
      stairs: { pos: [1.8, 2.5, 2.6], tgt: [5.2, 2.4, -1.8] },
      down: { pos: [3.6, 2.6, -2.4], tgt: [1.6, 2.0, -5] },
    };
    let hallBeam, hallMotes;
    const look = { yaw: 0, pitch: 0, ty: 0, tp: 0, drag: null, moved: 0 };
    let spinBtn, time = 0, hovered = null, view = "idle", choiceIdx = -1, opening = 0, openK = 0, backK = 0, entryT = -1, calc = null, hits = [], sectors = [], doorHinge, backHinge, dialPtr, portalMat, plateTex, plateDraw, tip, stairTip, camFrom = null, camK = 1, sayUntil = 0, timer = null;
    const unlocked = () => { try { return sessionStorage.getItem(ROOM_KEY) === "1"; } catch (e) { return true; } };
    const talking = () => performance.now() < sayUntil;
    function say(text) { sayUntil = performance.now() + Math.min(3400, 900 + text.length * 45); line.textContent = text; line.classList.remove("show"); void line.offsetWidth; line.classList.add("show"); }
    function setView(v) { if (view === v) return; view = v; look.ty = 0; look.tp = 0; camFrom = { pos: camera.position.clone(), tgt: camera.userData.tgt.clone() }; camK = 0; }
    function tex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.anisotropy = 4; return t; }

    // o que se vê pelo vão da porta em cada cor
    const previews = {
      vermelho: (g, w, h) => {
        const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, "#9CC4E4"); s.addColorStop(0.6, "#D8EBC8"); s.addColorStop(1, "#4E7A3E"); g.fillStyle = s; g.fillRect(0, 0, w, h);
        g.fillStyle = "#2F5A2E"; for (const [x, y, r] of [[70, 150, 90], [190, 120, 110], [130, 80, 80], [40, 230, 70], [220, 230, 80]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = "#5A4030"; g.fillRect(105, 230, 50, 170);
        g.fillStyle = "#1E140E"; g.beginPath(); g.ellipse(130, 330, 20, 34, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#EFE6D2"; g.lineWidth = 5; g.beginPath(); g.moveTo(100, 270); g.quadraticCurveTo(130, 285, 160, 270); g.stroke();
        g.fillStyle = "#6E9A4E"; g.fillRect(0, 400, w, 112);
      },
      preto: (g, w, h) => {
        g.fillStyle = "#050406"; g.fillRect(0, 0, w, h);
        for (let k = 8; k > 0; k--) { const s = k / 8; g.strokeStyle = `rgba(80,70,90,${0.25 * (1 - s)})`; g.lineWidth = 2; g.strokeRect(w / 2 - 120 * s, h / 2 - 220 * s, 240 * s, 440 * s); }
        const r = g.createRadialGradient(w / 2, h * 0.52, 0, w / 2, h * 0.52, 30); r.addColorStop(0, "rgba(255,214,120,1)"); r.addColorStop(1, "rgba(255,170,60,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h);
      },
      azul: (g, w, h) => { const s0 = g.createLinearGradient(0, 0, 0, h); s0.addColorStop(0, "#1C3442"); s0.addColorStop(1, "#0A1218"); g.fillStyle = s0; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(160,200,220,0.08)"; for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(w / 2 + Math.sin(k) * 60, 120 + k * 60, 140, 26, 0, 0, Math.PI * 2); g.fill(); } g.fillStyle = "rgba(220,235,245,0.55)"; g.font = "600 30px 'Shippori Mincho', serif"; g.textAlign = "center"; g.fillText("em breve", w / 2, h / 2); },
      azulAntigo: (g, w, h) => {
        const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, "#2E7896"); s.addColorStop(1, "#06141E"); g.fillStyle = s; g.fillRect(0, 0, w, h);
        g.fillStyle = "rgba(180,230,255,0.25)"; for (let k = 0; k < 14; k++) { g.beginPath(); g.arc((k * 53) % w, h - (k * 97) % h, 2 + (k % 3), 0, Math.PI * 2); g.fill(); }
        g.fillStyle = "rgba(255,255,255,0.12)"; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(k * 60, 0); g.lineTo(k * 60 + 40, 0); g.lineTo(k * 60 + 120, h); g.lineTo(k * 60 + 90, h); g.fill(); }
      },
      verde: (g, w, h) => {
        const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, "#7FA4D4"); s.addColorStop(0.55, "#EAD3A8"); s.addColorStop(0.56, "#7FA864"); s.addColorStop(1, "#4E7A3E"); g.fillStyle = s; g.fillRect(0, 0, w, h);
        g.fillStyle = "#9AA6BC"; g.beginPath(); g.moveTo(-20, 290); g.lineTo(90, 170); g.lineTo(200, 290); g.fill();
        g.fillStyle = "#C22026"; g.fillRect(150, 300, 8, 60); g.fillRect(190, 300, 8, 60); g.fillRect(140, 296, 68, 8);
        g.fillStyle = "rgba(255,255,255,0.8)"; for (const [x, y, r] of [[60, 70, 26], [96, 62, 30], [200, 90, 22]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
      },
      fechado: (g, w, h) => { g.fillStyle = "#0A0708"; g.fillRect(0, 0, w, h); },
    };
    const previewTex = {};

    function build() {
      const mat = toon(env);
      const B = Builder(); const r = mulberry(5);
      const WOOD = "#6B4A32", WOOD_D = "#3A2618", PLASTER = "#CDB894", BRICK = "#8A5A44", METAL = "#4E474C";
      for (let x = -6; x < 6; x += 0.5) B.add(new T.BoxGeometry(0.49, 0.06, 9.6), M(x + 0.25, 0, -0.3), r() < 0.5 ? "#7A5638" : "#6E4C32");
      B.add(new T.BoxGeometry(3.6, 0.02, 2.4), M(-0.8, 0.04, 0.9), "#7A2A26");
      B.add(new T.BoxGeometry(3.2, 0.025, 2.0), M(-0.8, 0.045, 0.9), "#A04A34");
      B.add(new T.BoxGeometry(2.4, 0.03, 1.2), M(-0.8, 0.05, 0.9), "#C9A24A");
      B.add(new T.BoxGeometry(12, 4.4, 0.14), M(0, 2.2, -5.1), PLASTER);
      for (const sx of [-1, 1]) B.add(new T.BoxGeometry(0.14, 4.4, 9.8), M(sx * 6.05, 2.2, -0.2), PLASTER);
      B.add(new T.BoxGeometry(12, 1.0, 0.06), M(0, 0.5, -5.02), WOOD);
      for (const sx of [-1, 1]) B.add(new T.BoxGeometry(0.06, 1.0, 9.8), M(sx * 5.98, 0.5, -0.2), WOOD);
      B.add(new T.BoxGeometry(12.2, 0.14, 10), M(0, 4.45, -0.2), "#4A3424");
      for (let z = -4.6; z <= 4; z += 1.6) B.add(new T.BoxGeometry(12, 0.26, 0.22), M(0, 4.28, z), WOOD_D);
      for (const x of [-3, 0, 3]) B.add(new T.BoxGeometry(0.22, 4.4, 0.22), M(x, 2.2, -4.95), WOOD_D);
      // parede da frente com a porta dos fundos (por onde se entra)
      for (const [x0, x1] of [[-6, BACKX - 0.65], [BACKX + 0.65, 6]]) B.add(new T.BoxGeometry(x1 - x0, 4.4, 0.16), M((x0 + x1) / 2, 2.2, 4.62), PLASTER);
      B.add(new T.BoxGeometry(1.3, 2.1, 0.16), M(BACKX, 3.35, 4.62), PLASTER);
      // por fora: chapas de metal rebitadas, como no casco do castelo
      for (let x = -6; x < 6; x += 1.2) for (let y = 0; y < 4.4; y += 1.1) {
        if (Math.abs(x + 0.6 - BACKX) < 1.0 && y < 2.3) continue;
        B.add(new T.BoxGeometry(1.16, 1.06, 0.06), M(x + 0.6, y + 0.55, 4.74), (Math.floor(x) + Math.floor(y)) % 2 ? METAL : "#5A5258");
        for (const [dx, dy] of [[-0.48, -0.44], [0.48, -0.44], [-0.48, 0.44], [0.48, 0.44]]) B.add(new T.SphereGeometry(0.035, 6, 4), M(x + 0.6 + dx, y + 0.55 + dy, 4.78), "#8A8288");
      }
      for (const sx of [-1, 1]) B.add(new T.BoxGeometry(0.14, 2.4, 0.3), M(BACKX + sx * 0.66, 1.2, 4.66), WOOD_D);
      B.add(new T.BoxGeometry(1.46, 0.14, 0.3), M(BACKX, 2.36, 4.66), WOOD_D);
      B.add(new T.BoxGeometry(0.14, 0.2, 0.14), M(BACKX + 1.1, 2.3, 4.92), "#FFC67A", 1); B.add(new T.ConeGeometry(0.14, 0.12, 4), M(BACKX + 1.1, 2.46, 4.92, 0, Math.PI / 4, 0), "#2A2626"); B.add(new T.BoxGeometry(0.18, 0.03, 0.18), M(BACKX + 1.1, 2.19, 4.92), "#2A2626"); B.add(new T.BoxGeometry(0.03, 0.03, 0.22), M(BACKX + 1.1, 2.55, 4.83), "#2A2626");
      B.add(new T.BoxGeometry(4.0, 0.08, 1.6), M(BACKX, 0.0, 6.0), "#3A3436");
      // janela, lareira, mesa, prateleiras, ervas
      B.add(new T.BoxGeometry(1.8, 1.5, 0.1), M(-3.6, 2.6, -5.0), WOOD_D);
      const HZ = -1.6;
      B.add(new T.BoxGeometry(1.3, 0.7, 2.6), M(-5.4, 0.35, HZ), (x, y) => (Math.floor(y * 6) % 2 ? BRICK : "#7A4E3A"));
      B.add(new T.BoxGeometry(1.0, 2.0, 0.5), M(-5.5, 1.7, HZ - 1.05), BRICK);
      B.add(new T.BoxGeometry(1.0, 2.0, 0.5), M(-5.5, 1.7, HZ + 1.05), BRICK);
      B.add(new T.BoxGeometry(1.2, 0.5, 2.6), M(-5.45, 2.9, HZ), "#7A4E3A");
      B.add(new T.BoxGeometry(1.0, 1.4, 1.8), M(-5.6, 3.8, HZ), "#6E4636");
      B.add(new T.BoxGeometry(0.2, 1.6, 1.6), M(-5.95, 1.4, HZ), "#1A1210");
      B.add(new T.BoxGeometry(1.5, 0.1, 2.9), M(-5.3, 3.18, HZ), WOOD);
      for (const [z, c] of [[-0.9, "#3E5A6A"], [-0.4, "#B98A4A"], [0.5, "#7A5A3A"], [1.0, "#5A6E4A"]]) B.add(new T.CylinderGeometry(0.1, 0.12, 0.34, 10), M(-5.1, 3.4, HZ + z), c);
      B.add(new T.CylinderGeometry(0.28, 0.24, 0.06, 18), M(-4.75, 2.35, HZ + 0.7, 0, 0, Math.PI / 2), "#2A2626");
      B.add(new T.BoxGeometry(0.04, 0.5, 0.06), M(-4.75, 2.75, HZ + 0.7), "#2A2626");
      B.add(new T.BoxGeometry(2.2, 0.1, 1.2), M(-1.0, 0.95, 0.9), WOOD);
      for (const [x, z] of [[-1.95, 0.4], [-0.05, 0.4], [-1.95, 1.4], [-0.05, 1.4]]) B.add(new T.BoxGeometry(0.1, 0.92, 0.1), M(x, 0.46, z), WOOD_D);
      for (const [x, z, ry] of [[-1.6, 1.9, 0.2], [-0.3, 1.95, -0.15], [-2.5, 0.9, Math.PI / 2]]) {
        B.add(new T.BoxGeometry(0.5, 0.06, 0.5), M(x, 0.55, z, 0, ry, 0), WOOD);
        B.add(new T.BoxGeometry(0.5, 0.6, 0.06), M(x + Math.sin(ry) * 0.22, 0.86, z + Math.cos(ry) * 0.22, 0, ry, 0), WOOD);
      }
      B.add(new T.SphereGeometry(0.16, 14, 10), M(-0.7, 1.12, 0.8, 0, 0, 0, 1, 0.8, 1), "#3E5A58");
      B.add(new T.CylinderGeometry(0.06, 0.05, 0.1, 10), M(-1.4, 1.05, 1.0), "#E8DCC2");
      B.add(new T.CylinderGeometry(0.06, 0.05, 0.1, 10), M(-1.1, 1.05, 1.2), "#E8DCC2");
      for (const y of [1.5, 2.1, 2.7]) {
        B.add(new T.BoxGeometry(1.8, 0.06, 0.4), M(-1.2, y, -4.85), WOOD);
        for (let k = 0; k < 5; k++) { const c = ["#8FC6E0", "#E0B85A", "#C26A8A", "#9AD08A", "#B0A0E0"][(k + Math.round(y * 3)) % 5]; B.add(new T.CylinderGeometry(0.08, 0.08, 0.22 + r() * 0.1, 10), M(-1.9 + k * 0.35, y + 0.15, -4.82), c, 0.55); }
      }
      for (let k = 0; k < 9; k++) { const x = -4.6 + k * 1.05, z = -3.0 + (k % 3) * 1.6, len = 0.4 + r() * 0.4; B.add(new T.CylinderGeometry(0.008, 0.008, len, 4), M(x, 4.17 - len / 2, z), "#2A2420"); B.add(new T.ConeGeometry(0.12, 0.34, 6), M(x, 4.0 - len, z, Math.PI, 0, 0), ["#5A7A44", "#7A8A44", "#8A6A3A"][k % 3]); }
      // escada para o quarto
      for (let k = 0; k < 13; k++) {
        const z = 2.4 - k * 0.48, y = 0.16 + k * 0.31;
        B.add(new T.BoxGeometry(1.3, 0.1, 0.5), M(5.2, y, z), WOOD);
        B.add(new T.BoxGeometry(1.3, y, 0.06), M(5.2, y / 2, z + 0.23), WOOD_D);
        if (k % 2 === 0) B.add(new T.CylinderGeometry(0.035, 0.035, 0.9, 6), M(4.55, y + 0.45, z), WOOD_D);
      }
      { const len = Math.hypot(13 * 0.48, 13 * 0.31); B.add(new T.BoxGeometry(0.08, 0.08, len), M(4.55, 0.16 + 6 * 0.31 + 0.9, 2.4 - 6 * 0.48, Math.atan2(0.31, 0.48), 0, 0), WOOD); }
      B.add(new T.BoxGeometry(1.5, 0.1, 1.6), M(5.2, 4.3, -4.2), "#1A1210");
      // batente da porta principal e placa
      B.add(new T.BoxGeometry(1.7, 0.18, 0.3), M(DX, 2.66, -4.95), WOOD_D);
      for (const sx of [-1, 1]) B.add(new T.BoxGeometry(0.18, 2.66, 0.3), M(DX + sx * 0.76, 1.33, -4.95), WOOD_D);
      B.add(new T.CylinderGeometry(0.5, 0.5, 0.08, 32), M(DX, 3.3, -4.98, Math.PI / 2, 0, 0), "#3A2618");
      // lajes de pedra diante da lareira
      for (let x = -5.8; x < -2.6; x += 0.72) for (let z = -3.4; z < 0.4; z += 0.72) B.add(new T.BoxGeometry(0.68, 0.05, 0.68), M(x + 0.36, 0.035, z + 0.36, 0, (r() - 0.5) * 0.08, 0), r() < 0.5 ? "#7A746E" : "#6A6460");
      // grade de ferro, gancho e chaleira na lareira
      for (let k = 0; k < 6; k++) B.add(new T.CylinderGeometry(0.02, 0.02, 0.24, 5), M(-4.75, 0.82, HZ - 0.55 + k * 0.22), "#2A2626");
      B.add(new T.BoxGeometry(0.04, 0.04, 1.3), M(-4.75, 0.94, HZ), "#2A2626");
      B.add(new T.CylinderGeometry(0.01, 0.01, 0.6, 4), M(-5.2, 2.0, HZ + 1.15), "#2A2626");
      B.add(new T.SphereGeometry(0.2, 14, 10), M(-5.2, 1.62, HZ + 1.15, 0, 0, 0, 1, 0.8, 1), "#3A3A3E");
      // panelas de cobre penduradas
      for (let k = 0; k < 4; k++) { const z = 0.6 + k * 0.42; B.add(new T.CylinderGeometry(0.008, 0.008, 0.3, 4), M(-5.9, 2.75, z), "#2A2420"); B.add(new T.CylinderGeometry(0.16 - k * 0.02, 0.13 - k * 0.02, 0.1, 16), M(-5.86, 2.5, z, 0, 0, Math.PI / 2), "#B87444"); }
      // prateleiras cheias: vidros de formatos diferentes, livros e rolos
      for (const y of [1.5, 2.1, 2.7]) {
        for (let k = 0; k < 4; k++) { const x = -0.2 + k * 0.22; B.add(new T.BoxGeometry(0.06, 0.26 + r() * 0.08, 0.2), M(x, y + 0.16, -4.84, 0, 0, k === 3 ? 0.3 : 0), ["#5A2E2A", "#2E4A3E", "#3B3A5E", "#7A5A2E"][k]); }
        B.add(new T.SphereGeometry(0.1, 10, 8), M(-2.3, y + 0.12, -4.8), "#9AD08A", 0.5);
        B.add(new T.CylinderGeometry(0.04, 0.04, 0.4, 8), M(0.5, y + 0.06, -4.78, Math.PI / 2, 0, 0.3), "#E8DCC2");
      }
      // caixotes, sacos, vassoura e balde perto da porta
      B.add(new T.BoxGeometry(0.7, 0.6, 0.7), M(3.4, 0.3, -4.4, 0, 0.2, 0), "#7A5A3E"); B.add(new T.BoxGeometry(0.5, 0.45, 0.5), M(3.3, 0.83, -4.4, 0, -0.3, 0), "#6A4C36");
      B.add(new T.SphereGeometry(1, 12, 8), M(-2.4, 0.3, -4.3, 0, 0, 0, 0.32, 0.36, 0.28), "#C9B48E"); B.add(new T.SphereGeometry(1, 12, 8), M(-2.0, 0.28, -4.4, 0, 0.5, 0, 0.28, 0.32, 0.26), "#B8A47E");
      B.add(new T.CylinderGeometry(0.025, 0.025, 1.6, 6), M(0.4, 0.8, -4.6, 0.15, 0, 0.1), "#7A5A3E"); B.add(new T.ConeGeometry(0.18, 0.4, 8), M(0.32, 0.2, -4.68), "#C9A24A");
      B.add(new T.CylinderGeometry(0.2, 0.16, 0.34, 14), M(0.9, 0.17, -4.5), "#6E6466");
      // velas acesas na mesa
      for (const [x, z] of [[-1.6, 0.6], [-0.4, 1.1]]) { B.add(new T.CylinderGeometry(0.04, 0.045, 0.22, 10), M(x, 1.11, z), "#F2EAD8"); B.add(new T.SphereGeometry(0.035, 8, 6), M(x, 1.26, z, 0, 0, 0, 1, 1.6, 1), "#FFD58A", 1); }
      // tábuas com veios por cima do assoalho
      for (let x = -6; x < 6; x += 0.5) for (let k = 0; k < 3; k++) B.add(new T.BoxGeometry(0.012, 0.004, 0.6 + r() * 1.4), M(x + 0.12 + r() * 0.26, 0.033, -4 + r() * 8.4), "#5A3E28");
      scene.add(new T.Mesh(B.build(), mat));

      // seletor: quadrantes clicáveis e ponteiro
      const dial = new T.Group(); dial.position.set(DX, 3.3, -4.92); scene.add(dial);
      DOORS.forEach((d, i) => {
        const a0 = Math.PI / 2 - (i + 1) * Math.PI / 2;
        const sec = new T.Mesh(new T.CircleGeometry(0.42, 24, a0, Math.PI / 2), new T.MeshBasicMaterial({ color: d.color }));
        sec.position.z = 0.01; sec.userData.sector = i; dial.add(sec); sectors.push(sec);
      });
      { const hub = new T.Mesh(new T.CircleGeometry(0.1, 20), new T.MeshBasicMaterial({ color: 0xc9a24a })); hub.position.z = 0.05; dial.add(hub); }
      dialPtr = new T.Mesh(new T.PlaneGeometry(0.06, 0.4), new T.MeshBasicMaterial({ color: 0xe8dcc2 }));
      dialPtr.geometry.translate(0, 0.2, 0); dialPtr.position.z = 0.04; dial.add(dialPtr);
      // placa com o destino escrito
      plateDraw = (txt, col) => (g, w, h) => { g.fillStyle = "#2A1C14"; g.fillRect(0, 0, w, h); g.strokeStyle = col || "#C9A24A"; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8); g.fillStyle = "#EFE6D2"; g.font = "600 30px 'Shippori Mincho', serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, w / 2, h / 2 + 2); };
      plateTex = tex(320, 64, plateDraw("Gire o seletor"));
      const plate = new T.Mesh(new T.PlaneGeometry(1.4, 0.28), new T.MeshBasicMaterial({ map: plateTex })); plate.position.set(DX, 2.92 + 0.0, -4.93); plate.position.y = 3.95; scene.add(plate);
      // vão da porta com a prévia do destino
      Object.keys(previews).forEach((k) => { previewTex[k] = tex(256, 512, previews[k]); });
      portalMat = new T.ShaderMaterial({ uniforms: { map: { value: previewTex.fechado }, uT: { value: 0 }, uOpen: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `uniform sampler2D map; uniform float uT, uOpen; varying vec2 vUv;
          void main(){ vec2 uv=vUv; uv.x+=sin(uv.y*14.0+uT*2.0)*0.006*(1.0-uOpen); vec3 c=texture2D(map,uv).rgb; float v=1.0-length((vUv-0.5)*vec2(1.2,0.7))*0.6; gl_FragColor=vec4(c*v*(0.25+uOpen*0.95),1.0); }` });
      const portal = new T.Mesh(new T.PlaneGeometry(1.36, 2.5), portalMat); portal.position.set(DX, 1.25, -5.02); scene.add(portal);
      doorHinge = new T.Group(); doorHinge.position.set(DX - 0.68, 0, -4.9); scene.add(doorHinge);
      const DB = Builder();
      DB.add(new T.BoxGeometry(1.36, 2.5, 0.1), M(0.68, 1.25, 0), WOOD);
      for (const y of [0.5, 1.25, 2.0]) DB.add(new T.BoxGeometry(1.36, 0.1, 0.03), M(0.68, y, 0.06), WOOD_D);
      DB.add(new T.SphereGeometry(0.06, 10, 8), M(1.18, 1.2, 0.1), "#C9A24A");
      doorHinge.add(new T.Mesh(DB.build(), mat));
      // porta dos fundos (abre para dentro)
      backHinge = new T.Group(); backHinge.position.set(BACKX - 0.6, 0, 4.62); scene.add(backHinge);
      const BB = Builder();
      BB.add(new T.BoxGeometry(1.2, 2.28, 0.1), M(0.6, 1.14, 0), "#5A3B26");
      for (const y of [0.4, 1.14, 1.9]) BB.add(new T.BoxGeometry(1.2, 0.08, 0.14), M(0.6, y, 0), "#3A2618");
      BB.add(new T.SphereGeometry(0.05, 8, 6), M(1.05, 1.1, 0.08), "#C9A24A"); BB.add(new T.SphereGeometry(0.05, 8, 6), M(1.05, 1.1, -0.08), "#C9A24A");
      backHinge.add(new T.Mesh(BB.build(), mat));

      const view = tex(256, 200, (g, w, h) => {
        const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, "#7FA4D4"); s.addColorStop(0.7, "#E9C9A0"); s.addColorStop(1, "#7FA864");
        g.fillStyle = s; g.fillRect(0, 0, w, h); g.fillStyle = "#7FA864"; g.fillRect(0, 140, w, 60);
        g.fillStyle = "#9AA6BC"; g.beginPath(); g.moveTo(20, 140); g.lineTo(110, 70); g.lineTo(200, 140); g.fill();
        g.fillStyle = "#F4F1EC"; g.beginPath(); g.moveTo(90, 86); g.lineTo(110, 70); g.lineTo(130, 86); g.fill();
        g.strokeStyle = "#3A2618"; g.lineWidth = 8; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
      });
      const wv = new T.Mesh(new T.PlaneGeometry(1.6, 1.3), new T.MeshBasicMaterial({ map: view })); wv.position.set(-3.6, 2.6, -4.94); scene.add(wv);
      hallBeam = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: { uT: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `uniform float uT; varying vec2 vUv; void main(){ float e=smoothstep(0.0,0.3,vUv.x)*smoothstep(1.0,0.7,vUv.x); float a=e*smoothstep(0.0,0.6,vUv.y)*0.14*(0.85+0.15*sin(uT*0.6)); gl_FragColor=vec4(vec3(1.0,0.88,0.62)*a,a); }` });
      const hb = new T.Mesh(new T.PlaneGeometry(1.6, 5.4), hallBeam); hb.position.set(-3.2, 1.4, -2.6); hb.rotation.set(-1.0, 0.2, 0); scene.add(hb);
      { const dg = new T.BufferGeometry(), dp = []; for (let i = 0; i < 120; i++) dp.push(-3.6 + (r() - 0.5) * 2.2, 0.3 + r() * 2.8, -4.4 + r() * 3.8); dg.setAttribute("position", new T.Float32BufferAttribute(dp, 3)); hallMotes = new T.Points(dg, new T.PointsMaterial({ color: 0xffe2a8, size: 0.03, transparent: true, opacity: 0.7, depthWrite: false })); scene.add(hallMotes); }
      // estrelas do lado de fora
      { const sg = new T.BufferGeometry(), sp = []; for (let k = 0; k < 180; k++) sp.push((r() - 0.5) * 60, 2 + r() * 30, 14 + r() * 30); sg.setAttribute("position", new T.Float32BufferAttribute(sp, 3)); scene.add(new T.Points(sg, new T.PointsMaterial({ color: 0xfff2d6, size: 0.12 }))); }

      calc = makeCalcifer(1.05); calc.group.position.set(-5.35, 0.66, HZ); scene.add(calc.group);
      const LB = Builder();
      LB.add(new T.CylinderGeometry(0.1, 0.1, 0.9, 8), M(-5.35, 0.76, HZ, 0.4, 0, Math.PI / 2), "#4A3020");
      LB.add(new T.CylinderGeometry(0.1, 0.1, 0.9, 8), M(-5.3, 0.76, HZ + 0.05, -0.4, 0, Math.PI / 2), "#5A3B26");
      scene.add(new T.Mesh(LB.build(), mat));

      const hitBox = (id, size, pos) => { const m = new T.Mesh(new T.BoxGeometry(...size), new T.MeshBasicMaterial()); m.visible = false; m.position.set(...pos); m.userData.spot = id; scene.add(m); hits.push(m); };
      hitBox("door", [1.8, 2.7, 0.5], [DX, 1.3, -4.8]);
      hitBox("calcifer", [1.2, 1.8, 2.0], [-5.3, 1.3, HZ]);
      hitBox("stairs", [1.4, 4.0, 6.4], [5.2, 2.0, -0.6]);

      env.uPL.value[0].set(-4.6, 1.3, HZ); env.uPLC.value[0].set("#FF8A3A"); env.uPLR.value[0] = 3.0;
      env.uPL.value[1].set(5.0, 3.6, -3.6); env.uPLC.value[1].set("#FFD39A"); env.uPLR.value[1] = 0.001;
      env.uPL.value[2].set(DX, 1.4, -4.3); env.uPLC.value[2].set("#FFD9A0"); env.uPLR.value[2] = 0.001;

      tip = document.createElement("div"); tip.className = "w-label"; tip.style.opacity = "0";
      spinBtn = document.createElement("button"); spinBtn.type = "button"; spinBtn.className = "w-btn"; spinBtn.textContent = "Girar o seletor";
      stairTip = document.createElement("div"); stairTip.className = "w-label w-label-call"; stairTip.style.opacity = "0"; stairTip.innerHTML = "<b>Suba primeiro</b><span>o quarto fica lá em cima</span>";
    }

    function choose(i) {
      if (opening === 1) return;
      if (!unlocked()) { setView("stairs"); say("Calma. Antes de qualquer porta, suba ao quarto."); return; }
      choiceIdx = (i + DOORS.length) % DOORS.length;
      const d = DOORS[choiceIdx];
      portalMat.uniforms.map.value = previewTex[d.id];
      env.uPLC.value[2].set(d.color === "#0B0809" ? "#6A4A8A" : d.color);
      plateDraw(d.name, d.color)(plateTex.image.getContext("2d"), 320, 64); plateTex.needsUpdate = true;
      setView("door"); say(d.say);
      const act = $("worldAction"); act.hidden = false; act.textContent = d.back ? "Sair pela porta" : d.locked ? "Trancada" : "Abrir a porta";
      spinBtn.hidden = false;
    }
    function openDoor() {
      if (choiceIdx < 0 || opening === 1) return;
      if (DOORS[choiceIdx].locked) { say("Está trancada. Ainda não tem nada do outro lado."); return; }
      opening = 1;
      const d = DOORS[choiceIdx];
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (current !== api) return;
        if (d.href) { window.open(d.href, "_blank", "noopener"); opening = -1; return; }
        if (d.back) { close(); return; }
        close(); open(d.world, "castelo");
      }, 1400);
    }
    function goUp() {
      setView("stairs"); say(unlocked() ? "O quarto continua lá em cima, do jeito que você deixou." : "Isso. Suba, o quarto fica lá em cima.");
      clearTimeout(timer); timer = setTimeout(() => { if (current === api) { close(); open("quarto", "castelo"); } }, 1500);
    }
    function pick(e) {
      const rc = canvas.getBoundingClientRect();
      ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const s = ray.intersectObjects(sectors)[0]; if (s) return "dial:" + s.object.userData.sector;
      const h = ray.intersectObjects(hits)[0];
      return h ? h.object.userData.spot : null;
    }
    const onDown = (e) => { if (e.target !== canvas || entryT >= 0) return; look.drag = { x: e.clientX, y: e.clientY, yaw: look.ty, pitch: look.tp }; look.moved = 0; };
    const onMove = (e) => {
      if (look.drag) { const dx = e.clientX - look.drag.x, dy = e.clientY - look.drag.y; look.moved = Math.max(look.moved, Math.abs(dx) + Math.abs(dy)); look.ty = Math.max(-1.2, Math.min(1.2, look.drag.yaw - dx * 0.004)); look.tp = Math.max(-0.4, Math.min(0.5, look.drag.pitch - dy * 0.003)); canvas.style.cursor = "grabbing"; return; }
      if (e.target !== canvas || entryT >= 0) return; hovered = pick(e); canvas.style.cursor = hovered ? "pointer" : "grab";
    };
    const onUp = (e) => { const d = look.drag; look.drag = null; if (d && look.moved > 6) return; onClick(e); };
    const onClick = (e) => {
      if (e.target !== canvas) return;
      if (entryT >= 0) { entryT = 99; return; }
      const s = pick(e);
      if (!s) return;
      if (s.startsWith("dial:")) choose(+s.slice(5));
      else if (s === "door") { if (!unlocked()) choose(0); else if (choiceIdx >= 0) openDoor(); else { setView("door"); say("Gire o seletor acima da porta: cada cor leva a um lugar."); } }
      else if (s === "calcifer") { setView("calcifer"); say(unlocked() ? "Eu sou o Calcifer. Mantenho o castelo andando e as portas abrindo." : "Eu sou o Calcifer. Suba ao quarto primeiro, depois a gente fala de portas."); }
      else if (s === "stairs") goUp();
    };
    const onAction = () => openDoor();
    const onSpin = () => choose(choiceIdx + 1);
    const LABELS = { door: ["Porta", "o seletor de cores"], calcifer: ["Calcifer", "o guia"], stairs: ["Escada", "sobe ao quarto"] };
    const labelFor = (h) => (h.startsWith("dial:") ? [DOORS[+h.slice(5)].name, DOORS[+h.slice(5)].sub] : LABELS[h]);

    const api = {
      template: "", dossierLabel: "Girar o seletor", choose: (i) => choose(i), openDoor: () => openDoor(),
      titleHTML: `<span class="w-kicker">Por dentro</span><span class="w-name">Castelo do Howl</span>`,
      hintText: "",
      build,
      start() {
        time = 0; hovered = null; choiceIdx = -1; opening = 0; openK = 0; camK = 1; camFrom = null;
        const ret = api.returnFrom; api.returnFrom = null;
        if (ret === "quarto") { try { sessionStorage.setItem(ROOM_KEY, "1"); } catch (e) { /* sem storage */ } }
        portalMat.uniforms.map.value = previewTex.fechado; portalMat.uniforms.uOpen.value = 0;
        plateDraw(unlocked() ? "Gire o seletor" : "Trancada")(plateTex.image.getContext("2d"), 320, 64); plateTex.needsUpdate = true;
        labels.appendChild(tip); labels.appendChild(stairTip);
        $("worldAction").hidden = true; $("worldAction").addEventListener("click", onAction);
        spinBtn.addEventListener("click", onSpin); document.querySelector(".world-actions").prepend(spinBtn); spinBtn.hidden = true;
        canvas.addEventListener("pointerdown", onDown); addEventListener("pointermove", onMove); addEventListener("pointerup", onUp);
        look.yaw = look.pitch = look.ty = look.tp = 0;
        api.dossierReady = false; dossierBtn.hidden = true;
        clearTimeout(timer);
        if (ret) {
          entryT = -1; backK = 0;
          view = ret === "quarto" ? "stairs" : "door";
          camera.position.set(...VIEWS[view].pos); camera.userData.tgt = new T.Vector3(...VIEWS[view].tgt);
          if (ret === "quarto") setTimeout(() => { if (current === api) setView("door"); }, 300);
          hint.textContent = "Toque numa cor do seletor, acima da porta.";
          spinBtn.hidden = false;
          timer = setTimeout(() => { if (current === api) say(ret === "quarto" ? "Agora sim. Gire o seletor e escolha uma porta." : "De volta. Quer outra porta?"); }, 500);
        } else {
          // entrada pela porta dos fundos
          entryT = 0; backK = 0; view = "outside";
          camera.position.set(...VIEWS.outside.pos); camera.userData.tgt = new T.Vector3(...VIEWS.outside.tgt);
          hint.textContent = "";
        }
      },
      stop() {
        clearTimeout(timer); canvas.removeEventListener("pointerdown", onDown); removeEventListener("pointermove", onMove); removeEventListener("pointerup", onUp); canvas.style.cursor = "";
        $("worldAction").removeEventListener("click", onAction); $("worldAction").hidden = true;
        spinBtn.removeEventListener("click", onSpin); if (spinBtn.parentNode) spinBtn.parentNode.removeChild(spinBtn);
      },
      resize(w, h) { camera.aspect = w / h; camera.fov = w / h < 0.9 ? 74 : 55; camera.updateProjectionMatrix(); },
      update(dt) {
        time += dt;
        portalMat.uniforms.uT.value = time;
        // entrada: a porta dos fundos abre e a câmera atravessa
        if (entryT >= 0) {
          entryT += dt;
          backK = smooth(0.6, 1.6, entryT);
          if (entryT > 1.3 && view === "outside") setView("idle");
          if (entryT > 3.4) {
            entryT = -1; view = "idle";
            hint.textContent = unlocked() ? "Toque numa cor do seletor, acima da porta, ou suba a escada." : "Suba a escada: o quarto vem primeiro.";
            if (unlocked()) spinBtn.hidden = false;
            say(unlocked() ? "De volta ao castelo. Gire o seletor e escolha uma porta." : "Ah, visita. Antes de qualquer porta, suba. O quarto fica lá em cima.");
          }
        } else backK += ((view === "outside" ? 1 : 0) - backK) * Math.min(1, dt * 2);
        backHinge.rotation.y = backK * 1.7;
        const idx = choiceIdx;
        const target = idx < 0 ? Math.sin(time * 0.6) * 0.1 : -(idx * Math.PI / 2 + Math.PI / 4);
        dialPtr.rotation.z += (target - dialPtr.rotation.z) * Math.min(1, dt * 5);
        if (opening === -1) { openK += (0 - openK) * Math.min(1, dt * 3); if (openK < 0.03) opening = 0; }
        else openK += ((opening === 1 ? 1 : 0) - openK) * Math.min(1, dt * 2.2);
        doorHinge.rotation.y = -openK * 1.9;
        portalMat.uniforms.uOpen.value = Math.max(openK, idx >= 0 ? 0.18 : 0);
        env.uPLR.value[2] = 0.001 + openK * 3.2 + (idx >= 0 ? 0.6 : 0);
        env.uPLR.value[1] = unlocked() ? 0.001 : 2.2 + Math.sin(time * 2) * 0.3;
        calc.U.uHot.value += ((hovered === "calcifer" ? 1 : 0) - calc.U.uHot.value) * Math.min(1, dt * 5);
        calc.update(dt, camera, talking());
        env.uPLC.value[0].setRGB(1.0, 0.54 + Math.sin(time * 7) * 0.04, 0.23).multiplyScalar(0.75 + Math.sin(time * 13) * 0.07);
        const V = VIEWS[view];
        const dp = new T.Vector3(...V.pos), dtg = new T.Vector3(...V.tgt);
        if (view === "idle" && !look.drag) { dp.x += pointer.sx * 0.4; dp.y -= pointer.sy * 0.18; }
        if (hallBeam) { hallBeam.uniforms.uT.value = time; hallMotes.position.y = Math.sin(time * 0.3) * 0.08; }
        if (opening === 1) dp.lerp(new T.Vector3(1.6, 1.6, -3.6), openK * 0.6);
        camK = Math.min(1, camK + dt / (entryT >= 0 ? 2.1 : 1.8));
        if (camK < 1 && camFrom) { const e = ease(camK); camera.position.copy(camFrom.pos).lerp(dp, e); camera.userData.tgt.copy(camFrom.tgt).lerp(dtg, e); }
        else { camera.position.lerp(dp, Math.min(1, dt * 3)); camera.userData.tgt.lerp(dtg, Math.min(1, dt * 3)); }
        look.yaw += (look.ty - look.yaw) * Math.min(1, dt * 6); look.pitch += (look.tp - look.pitch) * Math.min(1, dt * 6);
        { const dir = camera.userData.tgt.clone().sub(camera.position); const dist = dir.length(); dir.normalize();
          const yaw0 = Math.atan2(dir.x, dir.z) + look.yaw, pitch0 = Math.asin(Math.max(-1, Math.min(1, dir.y))) + look.pitch;
          camera.lookAt(camera.position.clone().add(new T.Vector3(Math.sin(yaw0) * Math.cos(pitch0), Math.sin(pitch0), Math.cos(yaw0) * Math.cos(pitch0)).multiplyScalar(dist))); }
        const place = (elx, p) => { const v = p.clone().project(camera); elx.style.transform = `translate(-50%, -100%) translate(${(v.x * 0.5 + 0.5) * W}px, ${(-v.y * 0.5 + 0.5) * H}px)`; return v.z < 1; };
        if (hovered && entryT < 0) {
          const L = labelFor(hovered);
          const at = hovered.startsWith("dial:") ? new T.Vector3(DX, 3.85, -4.9) : hits.find((x) => x.userData.spot === hovered).position.clone().add(new T.Vector3(0, hovered === "door" ? 1.8 : 1.2, 0));
          tip.innerHTML = `<b>${L[0]}</b><span>${L[1]}</span>`; place(tip, at); tip.style.opacity = "1";
        } else tip.style.opacity = "0";
        const showStair = !unlocked() && entryT < 0 && hovered !== "stairs";
        stairTip.style.opacity = showStair && place(stairTip, new T.Vector3(5.2, 3.4, 0.4)) ? "1" : "0";
      },
      render(rr) { rr.setRenderTarget(null); rr.render(scene, camera); },
    };
    return api;
  })();

  /* =================================================================== */
  /* ÁRVORE DO TOTORO (AcousticBuild): proteja o sono com a barreira certa */
  /* =================================================================== */
  function makeTotoro(o) {
    const { body: BODY, belly: BELLY, s = 1, mat } = o;
    const g = new T.Group();
    const B = Builder();
    B.add(new T.SphereGeometry(1, 28, 20), M(0, 1.2, 0, 0, 0, 0, 1.0, 1.22, 0.86), BODY);
    B.add(new T.SphereGeometry(0.82, 26, 18), M(0, 0.95, 0.5, 0, 0, 0, 0.8, 0.88, 0.45), BELLY);
    for (const [x, y] of [[-0.3, 1.5], [0, 1.55], [0.3, 1.5], [-0.15, 1.3], [0.15, 1.3], [-0.38, 1.25], [0.38, 1.25]]) {
      for (const sx of [-1, 1]) B.add(new T.BoxGeometry(0.11, 0.03, 0.03), M(x + sx * 0.045, y - 0.025, 0.86 - Math.abs(x) * 0.12, 0, 0, sx * 0.6), BODY);
    }
    for (const sx of [-1, 1]) {
      B.add(new T.ConeGeometry(0.15, 0.62, 10), M(sx * 0.38, 2.5, -0.05, 0, 0, -sx * 0.14), BODY);
      B.add(new T.SphereGeometry(1, 12, 10), M(sx * 0.98, 1.15, 0.12, 0, 0, sx * 0.25, 0.26, 0.52, 0.26), BODY);
      for (let k = 0; k < 3; k++) B.add(new T.ConeGeometry(0.03, 0.12, 5), M(sx * (1.02 + k * 0.03), 0.66, 0.2 + (k - 1) * 0.07, Math.PI, 0, 0), "#EFE9DA");
      B.add(new T.SphereGeometry(1, 12, 8), M(sx * 0.45, 0.1, 0.42, 0, 0, 0, 0.34, 0.14, 0.42), BODY);
      for (let k = 0; k < 3; k++) B.add(new T.ConeGeometry(0.03, 0.1, 5), M(sx * 0.45 + (k - 1) * 0.1, 0.08, 0.82, -Math.PI / 2, 0, 0), "#EFE9DA");
      for (let k = 0; k < 3; k++) B.add(new T.BoxGeometry(0.5, 0.012, 0.012), M(sx * 0.62, 1.8 + (k - 1) * 0.06, 0.66, 0, sx * 0.35, sx * (k - 1) * 0.12), "#2A2626");
    }
    B.add(new T.SphereGeometry(1, 10, 8), M(0, 1.9, 0.83, 0, 0, 0, 0.09, 0.04, 0.04), "#2A2626");
    const mesh = new T.Mesh(B.build(), mat); g.add(mesh);
    // olhos: fechados (dormindo) e abertos (acordado)
    const shut = Builder(), open = Builder();
    for (const sx of [-1, 1]) {
      shut.add(new T.TorusGeometry(0.1, 0.018, 6, 14, Math.PI), M(sx * 0.32, 1.98, 0.76, 0, 0, Math.PI), "#2A2626");
      open.add(new T.SphereGeometry(0.15, 16, 12), M(sx * 0.32, 1.98, 0.72, 0, 0, 0, 1, 1, 0.45), "#FFFFFF");
      open.add(new T.SphereGeometry(0.06, 12, 8), M(sx * 0.31, 1.98, 0.79), "#1A1616");
    }
    const eyesShut = new T.Mesh(shut.build(), mat), eyesOpen = new T.Mesh(open.build(), mat);
    eyesOpen.visible = false; g.add(eyesShut, eyesOpen);
    g.scale.setScalar(s);
    return { g, eyesShut, eyesOpen, base: 1 };
  }

  const arvore = (() => {
    const scene = new T.Scene();
    scene.background = new T.Color("#1A3A26");
    const camera = new T.PerspectiveCamera(52, 1, 0.1, 600);
    const env = envUniforms({ sun: [0.3, 0.85, 0.45], sunCol: "#A8C496", amb: "#2C4632", fog: "#1A3A26", fogDen: 0.016, glowCol: "#E8F0B0" });
    const HY = -80;                      // a toca fica num "andar" separado, longe da árvore
    let time = 0, phase = 0, k = 0, totoro, chu, chibi, smalls = [], flies = [], fade, audio = null, hush = null, timer = null, motes, camA, camB;
    const r0 = mulberry(5);

    function gnarlTrunk(geo, twist, amp) {
      const g = geo.index ? geo.toNonIndexed() : geo; const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const a0 = Math.atan2(z, x) + y * twist, rr = Math.hypot(x, z);
        const f = 1 + amp * (Math.sin(a0 * 5 + y * 0.35) * 0.6 + Math.sin(a0 * 11 - y * 0.8) * 0.3 + Math.sin(y * 0.25) * 0.4);
        p.setXYZ(i, Math.cos(a0) * rr * f, y, Math.sin(a0) * rr * f);
      }
      g.computeVertexNormals(); return g;
    }
    function limb(B, pts, r1, r2, color) {
      const c = new T.CatmullRomCurve3(pts.map((q) => new T.Vector3(...q)));
      const N = 4;
      for (let s = 0; s < N; s++) {
        const sub = new T.CatmullRomCurve3(c.getPoints(24).slice(s * 6, s * 6 + 7));
        B.add(new T.TubeGeometry(sub, 10, lerp(r1, r2, (s + 0.5) / N), 9, false), M(), color);
      }
    }
    const MOSS = (x, y, z) => { const n = Math.sin(x * 0.9 + y * 0.45) * Math.sin(z * 0.8 - y * 0.35); return n > 0.45 ? "#4A6A40" : n < -0.4 ? "#262E28" : "#34443A"; };

    function build() {
      const mat = toon(env);
      const B = Builder();
      // chão de musgo e samambaias
      B.add(new T.CircleGeometry(90, 48), M(0, 0, 0, -Math.PI / 2, 0, 0), (x, y) => (Math.hypot(x, y) < 14 ? "#22381F" : "#1C2E1C"));
      // tronco gigante, torcido e coberto de musgo
      B.add(gnarlTrunk(new T.CylinderGeometry(4.2, 7.2, 22, 56, 40, true), 0.045, 0.1), M(0, 11, 0), MOSS);
      B.add(gnarlTrunk(new T.CylinderGeometry(3.0, 4.3, 8, 40, 16, true), 0.06, 0.12), M(0, 25.5, 0), MOSS);
      // o nó escuro no tronco
      B.add(new T.SphereGeometry(1, 16, 12), M(0.6, 15, 4.3, 0, 0, 0, 1.0, 1.3, 0.4), "#0E1410");
      B.add(new T.TorusGeometry(1.1, 0.35, 8, 20), M(0.6, 15, 4.25, 0, 0, 0, 1, 1.25, 1), "#3E5C34");
      // galhos enormes que se abrem
      [[[0, 22, 0], [5, 26, 2], [11, 29, 1], [17, 33, -2]], [[0, 23, 0], [-6, 27, 1], [-12, 31, 3], [-18, 32, 2]], [[0, 26, 0], [2, 31, -4], [3, 37, -9], [1, 43, -12]],
       [[0, 27, 0], [-3, 32, -3], [-8, 37, -6], [-14, 41, -6]], [[0, 24, 0], [4, 28, 5], [7, 33, 9], [9, 38, 12]], [[0, 28, 0], [1, 34, 2], [-1, 40, 4], [-3, 46, 3]]]
        .forEach((pts, i) => limb(B, pts, 2.2 - i * 0.12, 0.5, MOSS));
      // galhos finos escuros no alto
      for (let i = 0; i < 22; i++) { const a = r0() * Math.PI * 2, y = 30 + r0() * 14, rr = 6 + r0() * 14; limb(B, [[Math.cos(a) * rr * 0.4, y - 4, Math.sin(a) * rr * 0.4], [Math.cos(a) * rr * 0.7, y, Math.sin(a) * rr * 0.7], [Math.cos(a + 0.3) * rr, y + 3 + r0() * 4, Math.sin(a + 0.3) * rr]], 0.45, 0.12, "#1E2A20"); }
      // copa escura, quase toda na névoa
      for (let i = 0; i < 70; i++) { const a = r0() * Math.PI * 2, rr = 4 + r0() * 22, y = 34 + r0() * 16 - rr * 0.2; B.add(new T.IcosahedronGeometry(3 + r0() * 3.5, 1), M(Math.cos(a) * rr, y, Math.sin(a) * rr), ["#1E3A24", "#24442A", "#2C5032", "#183020"][i % 4]); }
      // raízes que se espalham pelo chão
      for (let i = 0; i < 11; i++) {
        const a = i / 11 * Math.PI * 2 + 0.2; if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.25) continue;
        const c = Math.cos(a), s = Math.sin(a);
        limb(B, [[c * 5.5, 3.5, s * 5.5], [c * 8.5, 1.6, s * 8.5], [c * 12, 0.5, s * 12], [c * 16, -0.3, s * 16]], 1.5, 0.35, MOSS);
      }
      // o buraco entre as raízes, na frente
      B.add(new T.CircleGeometry(1.9, 24), M(0, 0.06, 9.2, -Math.PI / 2, 0, 0, 1.3, 1, 1), "#050806");
      B.add(new T.TorusGeometry(2.0, 0.45, 8, 24), M(0, 0.15, 9.2, Math.PI / 2, 0, 0, 1.3, 1, 0.6), "#2E4A2C");
      // corda sagrada fina, caída na frente
      { const pts = []; for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2; const rr = 6.9 + Math.sin(a * 5) * 0.15; pts.push(new T.Vector3(Math.cos(a) * rr, 4.2 - Math.max(0, Math.sin(a)) * 1.1, Math.sin(a) * rr)); }
        B.add(new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 120, 0.07, 6, true), M(), "#9A9886"); }
      // floresta ao fundo, mais clara (a luz atrás das árvores)
      for (let i = 0; i < 40; i++) {
        const a = i / 40 * Math.PI * 2 + r0() * 0.1, rr = 52 + r0() * 24, x = Math.cos(a) * rr, z = Math.sin(a) * rr, h = 18 + r0() * 16;
        if (z > 0) continue;
        B.add(new T.CylinderGeometry(0.6, 1.1, h, 8), M(x, h / 2, z), "#1A2A1E");
        for (let j = 0; j < 4; j++) B.add(new T.IcosahedronGeometry(3.2 + r0() * 2.6, 1), M(x + (r0() - 0.5) * 5, h * 0.6 + j * 3, z + (r0() - 0.5) * 5), ["#5E9A5A", "#6EAE62", "#4E8A50"][j % 3], 0.45);
      }
      for (let i = 0; i < 60; i++) { const a = r0() * Math.PI * 2, rr = 9 + r0() * 22; B.add(new T.ConeGeometry(0.6 + r0() * 0.6, 1.4 + r0(), 5), M(Math.cos(a) * rr, 0.6, Math.sin(a) * rr, (r0() - 0.5) * 0.4, r0() * 3, (r0() - 0.5) * 0.4), r0() < 0.5 ? "#2E5A2C" : "#3A6E34"); }
      scene.add(new T.Mesh(B.build(), mat));
      // os pequenos subindo na raiz
      const tm = toon(env);
      chu = makeTotoro({ body: "#5E7EB4", belly: "#D6E0EE", s: 0.32, mat: tm }); chu.g.position.set(-2.2, 1.2, 9.6); chu.g.rotation.y = -0.6; scene.add(chu.g);
      chibi = makeTotoro({ body: "#ECECE6", belly: "#FFFFFF", s: 0.2, mat: tm }); chibi.g.position.set(-3.2, 1.0, 9.9); chibi.g.rotation.y = -0.4; scene.add(chibi.g);
      [chu, chibi].forEach((t) => { t.eyesOpen.visible = true; t.eyesShut.visible = false; });
      // raios de luz caindo da copa
      const shaftMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `varying vec2 vUv; void main(){ float a=smoothstep(0.0,0.5,vUv.x)*smoothstep(1.0,0.5,vUv.x)*smoothstep(0.0,0.6,vUv.y)*0.09; gl_FragColor=vec4(vec3(0.85,1.0,0.7)*a,a); }` });
      for (let i = 0; i < 5; i++) { const sh = new T.Mesh(new T.PlaneGeometry(3 + i, 40), shaftMat); sh.position.set(-10 + i * 5, 20, -4 + i * 2); sh.rotation.set(0, 0.4 + i * 0.3, 0.25); scene.add(sh); }
      // poeira de luz
      const mg = new T.BufferGeometry(), mp = []; for (let i = 0; i < 160; i++) mp.push((r0() - 0.5) * 30, r0() * 20, (r0() - 0.5) * 30);
      mg.setAttribute("position", new T.Float32BufferAttribute(mp, 3));
      motes = new T.Points(mg, new T.PointsMaterial({ color: 0xd8f0a8, size: 0.08, transparent: true, opacity: 0.6 })); scene.add(motes);

      // ===== a toca, vista de cima =====
      const H = Builder(), rH = mulberry(77);
      H.add(new T.CircleGeometry(30, 48), M(0, HY, 0, -Math.PI / 2, 0, 0), (x, y) => { const d = Math.hypot(x * 0.8, y); return d < 4 ? "#7AA048" : d < 7 ? "#4E7A36" : d < 11 ? "#2E5428" : "#1E3A20"; });
      // a cavidade escura onde ele dorme
      const cave = new T.Shape(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, rr = 1 + 0.12 * Math.sin(a * 3) + 0.08 * Math.sin(a * 7); const x = Math.cos(a) * 4.6 * rr, y = Math.sin(a) * 3.3 * rr; if (i) cave.lineTo(x, y); else cave.moveTo(x, y); }
      H.add(new T.ShapeGeometry(cave, 6), M(0.6, HY + 0.05, -1.2, -Math.PI / 2, 0, 0), "#0E1A10");
      H.add(new T.ShapeGeometry(cave, 6), M(0.6, HY + 0.04, -1.2, -Math.PI / 2, 0, 0, 1.12, 1.12, 1), "#20361E");
      // samambaias, folhas largas, flores e pedras
      for (let i = 0; i < 70; i++) {
        const a = rH() * Math.PI * 2, rr = 6 + rH() * 9, x = Math.cos(a) * rr * 1.3, z = Math.sin(a) * rr;
        const leaf = new T.PlaneGeometry(0.7 + rH() * 0.6, 3 + rH() * 2.5, 1, 6);
        const pp = leaf.attributes.position; for (let j = 0; j < pp.count; j++) { const y = pp.getY(j); pp.setX(j, pp.getX(j) * (1 - Math.abs(y) / 3) ); }
        H.add(leaf, M(x, HY + 0.3 + rH() * 0.6, z, -Math.PI / 2 + 0.2, 0, Math.atan2(z, x) - Math.PI / 2), ["#5AA046", "#6EB850", "#3E8034", "#8CC860"][i % 4]);
      }
      for (let i = 0; i < 26; i++) { const a = rH() * Math.PI * 2, rr = 5.5 + rH() * 8, x = Math.cos(a) * rr * 1.3, z = Math.sin(a) * rr; for (let p = 0; p < 5; p++) { const pa = p / 5 * Math.PI * 2; H.add(new T.CircleGeometry(0.18, 8), M(x + Math.cos(pa) * 0.22, HY + 0.5, z + Math.sin(pa) * 0.22, -Math.PI / 2, 0, 0), i % 3 ? "#F4F2E6" : "#F2D24A"); } H.add(new T.CircleGeometry(0.1, 8), M(x, HY + 0.52, z, -Math.PI / 2, 0, 0), "#E8B83A"); }
      for (let i = 0; i < 10; i++) { const a = rH() * Math.PI * 2, rr = 8 + rH() * 6; H.add(new T.IcosahedronGeometry(0.5 + rH() * 0.6, 0), M(Math.cos(a) * rr * 1.3, HY + 0.2, Math.sin(a) * rr), "#3E4A40"); }
      scene.add(new T.Mesh(H.build(), mat));
      // poça de luz sobre o musgo
      const pool = new T.Mesh(new T.CircleGeometry(6, 32), new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending,
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `varying vec2 vUv; void main(){ float d=length(vUv-0.5)*2.0; float a=smoothstep(1.0,0.0,d)*0.16; gl_FragColor=vec4(vec3(0.95,1.0,0.6)*a,a); }` }));
      pool.rotation.x = -Math.PI / 2; pool.position.set(-1.2, HY + 0.3, 3.4); pool.scale.set(1.3, 1, 1); scene.add(pool);
      // o Totoro deitado de barriga para cima, e os pequenos ao lado
      totoro = makeTotoro({ body: "#5E6672", belly: "#D8D0BA", s: 2.2, mat });
      const tg = new T.Group(); tg.position.set(0.6, HY + 0.7, -1.2); tg.rotation.y = Math.PI / 2 - 0.2; scene.add(tg);
      totoro.g.rotation.set(-Math.PI / 2, 0, 0); totoro.g.position.set(0, 0, 2.6); tg.add(totoro.g);
      const c2 = makeTotoro({ body: "#5E7EB4", belly: "#D6E0EE", s: 0.55, mat }); c2.g.position.set(-2.6, HY + 0.1, 4.2); c2.g.rotation.set(-0.5, 0.3, 0); scene.add(c2.g);
      const c3 = makeTotoro({ body: "#ECECE6", belly: "#FFFFFF", s: 0.32, mat }); c3.g.position.set(-1.1, HY + 0.1, 4.5); c3.g.rotation.set(-0.5, -0.2, 0); scene.add(c3.g);
      smalls = [c2, c3];
      // borboletas claras
      for (let i = 0; i < 4; i++) {
        const b = new T.Group(); const wm = new T.MeshBasicMaterial({ color: i % 2 ? 0xbfe6e0 : 0xeef4dc, side: T.DoubleSide, transparent: true, opacity: 0.9 });
        const wing = new T.Shape(); wing.moveTo(0, 0); wing.bezierCurveTo(0.5, 0.5, 0.9, 0.35, 0.75, -0.05); wing.bezierCurveTo(0.7, -0.4, 0.3, -0.45, 0, 0);
        const wg = new T.ShapeGeometry(wing, 8);
        const w1 = new T.Group(), w2 = new T.Group(); w1.add(new T.Mesh(wg, wm)); const m2 = new T.Mesh(wg, wm); m2.scale.x = -1; w2.add(m2); b.add(w1, w2);
        const bodyB = new T.Mesh(new T.CapsuleGeometry(0.04, 0.3, 4, 6), new T.MeshBasicMaterial({ color: 0x3a3a30 })); bodyB.rotation.x = Math.PI / 2; b.add(bodyB);
        scene.add(b); flies.push({ b, w1, w2, a: rH() * 6, r: 4 + rH() * 4, y: HY + 1.5 + rH() * 2 });
      }
      env.uPL.value[0].set(-1.5, HY + 7, 4); env.uPLC.value[0].set("#C8DC98"); env.uPLR.value[0] = 3.5;
      env.uPL.value[1].set(-14, 20, 18); env.uPLC.value[1].set("#9FD08A"); env.uPLR.value[1] = 10;
      env.uPL.value[2].set(0, 3, 12); env.uPLC.value[2].set("#6E9A5E"); env.uPLR.value[2] = 6;

      fade = document.createElement("div"); fade.className = "tt-fade";
      camA = { pos: new T.Vector3(0, 1.8, 27), tgt: new T.Vector3(0, 17, 0) };
      camB = { pos: new T.Vector3(0.2, HY + 15, 0.6), tgt: new T.Vector3(0, HY, 0) };
    }

    function startHush() {
      try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        if (audio.state === "suspended") audio.resume();
        const ctx = audio, nb = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), d = nb.getChannelData(0);
        let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3; }
        const src = ctx.createBufferSource(); src.buffer = nb; src.loop = true;
        const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 500; f.Q.value = 0.6;
        const g = ctx.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 2);
        src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(); hush = { src, g };
      } catch (e) { /* sem áudio */ }
    }
    function stopHush() { if (hush && audio) { try { hush.g.gain.linearRampToValueAtTime(0, audio.currentTime + 0.6); hush.src.stop(audio.currentTime + 0.7); } catch (e) { /* parado */ } } hush = null; }
    function approach() {
      if (phase !== 0) return;
      phase = 1; k = 0; hint.textContent = ""; $("worldAction").hidden = true;
    }
    const onClick = (e) => { if (e.target === canvas) approach(); };
    const say = (t) => { line.textContent = t; line.classList.remove("show"); void line.offsetWidth; line.classList.add("show"); };

    const api = {
      template: "dossierArvore", dossierLabel: "Ver a história do AcousticBuild", kamiColor: "totoro", approach: () => approach(),
      titleHTML: `<span class="w-kicker">AcousticBuild</span><span class="w-name">A grande árvore</span>`,
      hintText: "Toque para se aproximar.",
      build,
      start() {
        time = 0; phase = 0; k = 0; api.dossierReady = false; dossierBtn.hidden = true;
        camera.position.copy(camA.pos); camera.userData.tgt = camA.tgt.clone(); camera.up.set(0, 1, 0);
        el.appendChild(fade); fade.classList.remove("on");
        canvas.addEventListener("click", onClick);
        const act = $("worldAction"); act.hidden = false; act.textContent = "Aproximar"; act.onclick = approach;
        startHush();
      },
      stop() { clearTimeout(timer); canvas.removeEventListener("click", onClick); $("worldAction").onclick = null; stopHush(); if (fade.parentNode) fade.parentNode.removeChild(fade); camera.up.set(0, 1, 0); },
      resize(w, h) { camera.aspect = w / h; camera.fov = w / h < 0.9 ? 70 : 52; camera.updateProjectionMatrix(); },
      update(dt) {
        time += dt;
        motes.rotation.y = time * 0.01;
        // os pequenos andam pela raiz
        chu.g.position.y = 1.2 + Math.abs(Math.sin(time * 4)) * 0.12; chibi.g.position.y = 1.0 + Math.abs(Math.sin(time * 5 + 1)) * 0.1;
        // respiração do Totoro e das borboletas
        const br = Math.sin(time * 1.1);
        totoro.g.scale.set(2.2 * (1 + br * 0.015), 2.2 * (1 + br * 0.02), 2.2 * (1 + br * 0.03));
        smalls.forEach((t, i) => { t.g.position.y = HY + 0.1 + Math.abs(Math.sin(time * 1.5 + i)) * 0.04; });
        flies.forEach((f) => { f.a += dt * 0.35; f.b.position.set(Math.cos(f.a) * f.r, f.y + Math.sin(time * 2 + f.r) * 0.4, Math.sin(f.a * 1.3) * f.r * 0.7); const fl = Math.sin(time * 14 + f.r) * 0.9; f.w1.rotation.y = fl; f.w2.rotation.y = -fl; f.b.rotation.set(-Math.PI / 2, 0, f.a); });
        if (phase === 0) {
          const p = camA.pos.clone(); p.x += pointer.sx * 1.5; p.y += -pointer.sy * 0.6 + Math.sin(time * 0.4) * 0.15;
          camera.position.lerp(p, Math.min(1, dt * 2)); camera.lookAt(camA.tgt);
        } else if (phase === 1) {
          // aproxima, abaixa até o buraco e mergulha
          k = Math.min(1, k + dt / 4.2);
          const e = ease(k);
          const p1 = new T.Vector3(0, 6, 15), p2 = new T.Vector3(0, 0.6, 9.2);
          const pos = k < 0.6 ? camA.pos.clone().lerp(p1, ease(k / 0.6)) : p1.clone().lerp(p2, ease((k - 0.6) / 0.4));
          const tgt = camA.tgt.clone().lerp(new T.Vector3(0, -2, 9.2), e);
          camera.position.copy(pos); camera.lookAt(tgt);
          if (k > 0.82) fade.classList.add("on");
          if (k >= 1) {
            phase = 2; k = 0;
            camera.position.copy(camB.pos).add(new T.Vector3(0, 6, 0)); camera.up.set(0, 0, -1);
            setTimeout(() => { if (current === api) fade.classList.remove("on"); }, 250);
          }
        } else {
          // dentro: a câmera desce devagar sobre a toca
          k = Math.min(1, k + dt / 5);
          const pos = camB.pos.clone().add(new T.Vector3(Math.sin(time * 0.2) * 0.4 + pointer.sx * 0.6, 6 * (1 - ease(k)), Math.cos(time * 0.17) * 0.3 + pointer.sy * 0.4));
          camera.position.copy(pos); camera.up.set(0, 0, -1); camera.lookAt(camB.tgt);
          if (phase === 2 && k > 0.55) {
            phase = 3; say("Shh. Ele está dormindo.");
            api.dossierReady = true; dossierBtn.hidden = false;
            timer = setTimeout(() => { if (current === api) showDossier(); }, 3600);
          }
        }
      },
      render(rr) { rr.setRenderTarget(null); rr.render(scene, camera); },
    };
    return api;
  })();

  // o último trem reaproveita o vagão da galeria, em modo de despedida
  const ultimo = {
    template: "", dossierLabel: "", titleHTML: "", hintText: "",
    build() { if (!trem.built) { trem.build(); trem.built = true; } },
    start() { trem.start(); trem.startFinal(); $("worldAction").hidden = true; },
    stop() { trem.stop(); },
    resize: (w, h) => trem.resize(w, h), update: (dt) => trem.update(dt), render: (r) => trem.render(r), dragon: () => { const d = trem.dragonNow; if (d) d(); },
  };
  const worlds = { nos, torre, trem, quarto, castelo, arvore, ultimo };
  window.mundos = { open, close, worlds };
})();
