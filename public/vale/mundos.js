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
        float g(float x, float c, float w){ return exp(-pow((x-c)/w,2.0)); }
        void main(){
          float t=uT;
          vec2 q=vec2((vUv.x-0.5)*0.8125, vUv.y);
          vec2 c=vec2(0.0,0.35);
          vec2 v=q-c; v.x-=0.025*sin(t*1.9+q.y*5.0)*smoothstep(0.0,0.4,v.y);
          float ang=atan(v.y,v.x);
          float dist=length(v*vec2(1.0,0.94));
          // contorno macio: bolha com línguas no topo
          float top=g(ang,1.57+0.12*sin(t*1.3),0.32)*0.15*(0.85+0.15*sin(t*3.1))
                   +g(ang,2.15+0.05*sin(t*2.0),0.17)*0.075*(0.6+0.4*sin(t*4.3+1.0))
                   +g(ang,1.0+0.05*sin(t*2.4),0.18)*0.07*(0.6+0.4*sin(t*3.7+2.0));
          float r=0.25+top+0.016*snoise(vec2(ang*2.0,t*0.7))+0.004*snoise(vec2(ang*5.0,t*1.6));
          float body=smoothstep(r+0.014,r-0.03,dist);
          float aura=smoothstep(r+0.11,r-0.01,dist);
          // chaminhas soltas que sobem e somem
          float wisp=0.0;
          for(int i=0;i<2;i++){
            float fi=float(i); float ph=fract(t*0.32+fi*0.5);
            vec2 wp=c+vec2((fi-0.5)*0.07+sin(t+fi*3.0)*0.03, 0.27+ph*0.3);
            wisp=max(wisp, smoothstep(0.045*(1.0-ph)+0.01,0.0,length((q-wp)*vec2(1.3,0.8)))*(1.0-ph));
          }
          // braços de fogo
          float arms=0.0;
          for(int k=0;k<2;k++){
            float sx=k==0?-1.0:1.0;
            vec2 p=q-vec2(sx*0.19,0.25);
            float along=sx*p.x; float len=0.16*uArms;
            float wav=0.018*sin(along*32.0-t*11.0+sx);
            float th=mix(0.04,0.012,clamp(along/max(len,0.001),0.0,1.0));
            float fing=smoothstep(len-0.04,len,along)*0.02*sin((p.y+wav)*90.0);
            arms=max(arms, smoothstep(th+0.008,th-0.006,abs(p.y-wav-0.01*along*6.0)+fing)*step(0.0,along)*smoothstep(len,len-0.035,along));
          }
          // cores: âmbar no centro, laranja, borda vermelha esfumaçada
          float k=clamp(dist/r,0.0,1.0);
          vec3 col=mix(vec3(0.97,0.66,0.24),vec3(0.91,0.48,0.14),smoothstep(0.25,0.75,k));
          col=mix(col,vec3(0.78,0.25,0.08),smoothstep(0.72,1.0,k));
          col*=0.96+0.06*snoise(q*4.0+vec2(0.0,-t*0.5));
          col*=1.0+uHot*0.15;
          vec3 auraCol=vec3(0.62,0.12,0.04);
          vec3 outc=mix(auraCol,col,body);
          outc=mix(outc,vec3(0.95,0.55,0.18),wisp*(1.0-body));
          outc=mix(outc,mix(vec3(1.0,0.86,0.42),vec3(0.98,0.62,0.2),0.3),arms*(1.0-body));
          float a=max(max(aura*0.62,body),max(wisp*0.85,arms));
          // olhos redondos, bege, pupila pequena
          float bl=max(uBlink,0.07);
          for(int e=0;e<2;e++){
            float sx=e==0?-1.0:1.0;
            vec2 ec=vec2(sx*0.078,0.395);
            float ed=length((q-ec)/vec2(0.05,0.054*bl));
            outc=mix(outc,vec3(0.22,0.08,0.03),smoothstep(1.14,1.06,ed)*body);
            outc=mix(outc,vec3(0.95,0.90,0.80),smoothstep(1.02,0.96,ed)*body);
            vec2 pc=ec+uLook*vec2(0.016,0.013*bl);
            outc=mix(outc,vec3(0.16,0.07,0.03),smoothstep(0.019,0.015,length((q-pc)/vec2(1.0,bl)))*step(ed,1.0)*body);
          }
          // boca: pílula quando calado; um D largo quando fala
          vec2 mc=vec2(0.0,0.3);
          float open=smoothstep(0.08,0.4,uTalk);
          vec2 mp=q-mc;
          float pill=length(vec2(max(abs(mp.x)-0.034,0.0),mp.y))-0.011;
          float dh=0.012+0.055*uTalk;
          float dshape=max(length(vec2(mp.x/0.1,(mp.y+0.002)/dh))-1.0, mp.y-0.006);
          float m=mix(pill*30.0,dshape,open);
          float inside=smoothstep(0.02,-0.02,m);
          float rim=smoothstep(0.12,0.04,abs(m))*(1.0-inside*0.0);
          vec3 mouthCol=mix(vec3(0.88,0.36,0.16),mix(vec3(0.42,0.06,0.02),vec3(0.95,0.62,0.24),smoothstep(-0.006-dh*0.45,-0.006-dh*0.9,mp.y)),open);
          outc=mix(outc,vec3(0.25,0.07,0.02),smoothstep(0.35,0.0,abs(m))*body*0.9);
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
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
    if (name === "nos" && !w.entered) { showGate(from); return; }
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
    scene.background = new T.Color("#040305");
    const camera = new T.PerspectiveCamera(56, 1, 0.05, 120);
    const env = envUniforms({ sun: [0.2, 0.9, 0.3], sunCol: "#262A40", amb: "#1C161E", fog: "#040305", fogDen: 0.07, glowCol: "#E0A458" });
    const LINES = ["A casa conhece você.", "Até o que você esconde.", "E sabe onde procurar.", "Volta… por favor."];
    const START = 3.5, END = -50, KNOT = new T.Vector3(0, 1.55, -55.5);
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
    const audioEl = $("nosAudio");

    function build() {
      const mat = toon(env);
      const B = Builder(); const r = mulberry(31);
      const W2 = 1.6, HH = 3.2;
      // piso, paredes e teto do corredor
      for (let z = 6; z > -60; z -= 0.5) B.add(new T.BoxGeometry(W2 * 2, 0.04, 0.48), M(0, 0, z), ((z * 2) | 0) & 1 ? "#24150F" : "#1C100B");
      for (const sx of [-1, 1]) {
        B.add(new T.BoxGeometry(0.1, HH, 66), M(sx * W2, HH / 2, -27), (x, y, z) => (((z * 1.3) | 0) & 1 ? "#2A2028" : "#241B22"));
        B.add(new T.BoxGeometry(0.06, 0.9, 66), M(sx * (W2 - 0.04), 0.45, -27), "#1E140F");
      }
      B.add(new T.BoxGeometry(W2 * 2, 0.1, 66), M(0, HH, -27), "#120C10");
      // batentes que se repetem, cada vez mais tortos
      for (let k = 0; k < 9; k++) {
        const z = -2 - k * 6.2, tilt = (k % 2 ? 1 : -1) * k * 0.012;
        const Mb = M(0, 0, z, 0, 0, tilt);
        for (const sx of [-1, 1]) B.add(new T.BoxGeometry(0.22, HH, 0.26), Mb.clone().multiply(M(sx * (W2 - 0.1), HH / 2, 0)), "#3A2618");
        B.add(new T.BoxGeometry(W2 * 2, 0.26, 0.26), Mb.clone().multiply(M(0, HH - 0.13, 0)), "#3A2618");
      }
      // entulho: casacos pendurados, molduras, caixas, uma cadeira
      for (let k = 0; k < 28; k++) {
        const sx = r() < 0.5 ? -1 : 1, z = 1 - r() * 50, kind = r();
        if (kind < 0.3) { B.add(new T.BoxGeometry(0.12, 0.9 + r() * 0.3, 0.5), M(sx * (W2 - 0.12), 1.7, z, 0, 0, sx * 0.05), ["#2E2430", "#3A2A24", "#26302E"][k % 3]); B.add(new T.BoxGeometry(0.08, 0.06, 0.3), M(sx * (W2 - 0.1), 2.2, z), "#5A4632"); }
        else if (kind < 0.6) { const w = 0.4 + r() * 0.5, h = 0.3 + r() * 0.5; B.add(new T.BoxGeometry(0.05, h + 0.08, w + 0.08), M(sx * (W2 - 0.05), 1.6 + r() * 0.8, z, (r() - 0.5) * 0.2, 0, 0), "#5A4632"); B.add(new T.BoxGeometry(0.06, h, w), M(sx * (W2 - 0.06), 1.6 + r() * 0.8, z), "#141018"); }
        else if (kind < 0.85) { const s = 0.3 + r() * 0.4; B.add(new T.BoxGeometry(s, s, s), M(sx * (W2 - s / 2 - 0.08), s / 2, z, 0, r(), 0), ["#3A2A1E", "#2E241C"][k % 2]); if (r() < 0.5) B.add(new T.BoxGeometry(s * 0.8, s * 0.8, s * 0.8), M(sx * (W2 - s / 2 - 0.1), s + s * 0.4, z, 0, r(), 0), "#33261C"); }
        else { B.add(new T.BoxGeometry(0.5, 0.06, 0.5), M(sx * (W2 - 0.4), 0.5, z, 0, 0.4, 0.1), "#3A2618"); B.add(new T.BoxGeometry(0.5, 0.6, 0.06), M(sx * (W2 - 0.2), 0.8, z, 0, 0.4, 0.15), "#3A2618"); }
      }
      // parede do fundo, onde o nó espera
      B.add(new T.BoxGeometry(W2 * 2, HH, 0.1), M(0, HH / 2, -58), "#1A1418");
      scene.add(new T.Mesh(B.build(), mat));
      // o fio dourado no chão
      const pts = []; for (let k = 0; k <= 60; k++) { const z = START + 1 - k * (START + 1 - KNOT.z) / 60; pts.push(new T.Vector3(Math.sin(k * 0.5) * 0.35, 0.04 + (k > 54 ? (k - 54) * 0.25 : 0), z)); }
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
      env.uPL.value[1].set(0, 2.4, 6); env.uPLC.value[1].set("#40507A"); env.uPLR.value[1] = 4;
      env.uPL.value[2].set(0, 1.6, 0); env.uPLC.value[2].set("#6A5440"); env.uPLR.value[2] = 1.2;
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
      stopDrone();
      if (audioEl) { audioEl.currentTime = 0; audioEl.volume = 0; const p = audioEl.play(); if (p && p.catch) p.catch(() => {}); }
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
      titleHTML: `<span class="w-kicker">Porta preta</span><span class="w-name nos">&nbsp;</span>`,
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
        startDrone();
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
        stepAcc += before - walk; if (stepAcc > 0.85) { stepAcc = 0; footstep(); }
        const prog = (START - walk) / (START - END);
        const nextLine = Math.floor(prog * (LINES.length + 1));
        if (nextLine > said && said < LINES.length && nextLine <= LINES.length) { said = nextLine; say(LINES[said - 1]); }
        const bob = moving ? Math.sin(time * 9) * 0.03 : 0;
        camera.position.set(Math.sin(time * 0.7) * 0.05 + pointer.sx * 0.15, 1.55 + bob, walk);
        camera.lookAt(pointer.sx * 0.6, 1.5 - pointer.sy * 0.3, walk - 6);
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
      const a = b.a0 + t * 0.05;
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
    let time = 0, travel = 0, speed = SPEED0, target = SPEED0, movers = [], photos = [], hovered = null, open = null, audio = null, clackTimer = null, rumble = null;
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    const wrap = (x) => ((x % L) + L) % L - L / 2;
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const SKY = `
      vec3 skyCol(vec3 d){
        float y=d.y;
        vec3 top=vec3(0.30,0.40,0.66), mid=vec3(0.90,0.66,0.66), low=vec3(1.0,0.84,0.64);
        vec3 c=mix(low,mid,smoothstep(0.0,0.16,y)); c=mix(c,top,smoothstep(0.14,0.62,y));
        float s=max(dot(d,normalize(vec3(-0.45,0.09,-0.89))),0.0);
        c+=vec3(1.0,0.78,0.5)*pow(s,10.0)*0.6+vec3(1.0,0.96,0.85)*smoothstep(0.9986,0.9993,s);
        return c;
      }`;

    function build() {
      const mat = toon(env);
      // céu
      const sky = new T.Mesh(new T.SphereGeometry(1200, 40, 20), new T.ShaderMaterial({
        side: T.BackSide, depthWrite: false,
        vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `${NOISE} ${SKY} varying vec3 vD;
          void main(){ vec3 d=normalize(vD); vec3 c=skyCol(d);
            float band=snoise(vec2(atan(d.z,d.x)*2.4,d.y*11.0))*0.5+0.5;
            float cl=smoothstep(0.6,0.82,band)*smoothstep(0.04,0.1,d.y)*smoothstep(0.36,0.16,d.y);
            c=mix(c,vec3(0.99,0.74,0.72),cl*0.7);
            gl_FragColor=vec4(c,1.0); }`,
      }));
      sky.renderOrder = -1; scene.add(sky); scene.userData.sky = sky;

      // água que reflete o céu, com ondulações e o caminho de brilho do sol
      const water = new T.Mesh(new T.PlaneGeometry(1600, 1600, 1, 1), new T.ShaderMaterial({
        uniforms: { uTravel: { value: 0 }, uTime: { value: 0 } },
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
            c+=vec3(1.0,0.86,0.6)*smoothstep(0.55,0.95,n)*0.12*(1.0-smoothstep(10.0,120.0,d));
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
    const onMove = (e) => { if (e.target !== canvas) return; hovered = pick(e); canvas.style.cursor = hovered !== null ? "pointer" : ""; };
    const onClick = (e) => { if (e.target !== canvas) return; const i = pick(e); if (i !== null) showMem(i); };

    const api = {
      template: "dossierTrem", dossierLabel: "", show: (i) => showMem(i), at: (i) => { travel = (i * (L / MEMS.length) + 8 - L / 2 + L * 10) % L; },
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
      stop() { canvas.removeEventListener("click", onClick); canvas.removeEventListener("pointermove", onMove); canvas.style.cursor = ""; stopSound(); },
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
  /* O QUARTO (alto do castelo): os gostos, com o Calcifer na lareira      */
  /* =================================================================== */
  const quarto = (() => {
    const scene = new T.Scene();
    scene.background = new T.Color("#160F0C");
    const camera = new T.PerspectiveCamera(52, 1, 0.1, 200);
    const env = envUniforms({ sun: [-0.35, 0.75, 0.55], sunCol: "#6E5646", amb: "#3A2D28", fog: "#160F0C", fogDen: 0.012, glowCol: "#FFB25A" });
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const SERIF = "'Shippori Mincho', 'Hiragino Mincho ProN', serif", MONO = "'JetBrains Mono', ui-monospace, monospace";
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    let time = 0, hovered = null, selected = null, hits = [], calc = null, charms = [], tip, camFrom = null, camK = 1, sayTimer = null;

    // o que cada canto do quarto guarda (espelha a aba Gostos do perfil)
    const SPOTS = {
      anime: {
        name: "Estante", sub: "Animes", k: "漫",
        view: { pos: [-2.6, 1.9, 0.9], tgt: [-5.8, 1.25, -0.2] },
        say: "A estante dos animes. Nenhum volume perto de mim, por favor.",
        html: () => `<span class="w-kicker">Estante · animes</span><h2 class="d-title">Animes</h2>
          <p class="d-sub">Cada prateleira, uma série.</p>
          <ul class="q-list"><li><b>Frieren</b><small>a jornada depois do fim da aventura</small></li><li><b>Attack on Titan</b><small>muralhas, liberdade e escolhas difíceis</small></li><li><b>Tokyo Ghoul</b><small>dois mundos dentro da mesma pessoa</small></li></ul>
          <p class="d-note">A Torre dos Grimórios, no vale, é inspirada em Frieren.</p>`,
      },
      ghibli: {
        name: "Pôsteres", sub: "Studio Ghibli", k: "宮",
        view: { pos: [3.1, 2.0, 0.4], tgt: [3.25, 2.0, -4.6] },
        say: "Os filmes favoritos. Um deles tem um demônio do fogo muito bonito.",
        html: () => `<span class="w-kicker">Parede · Studio Ghibli</span><h2 class="d-title">Studio Ghibli</h2>
          <p class="d-sub">Os três favoritos, e os outros filmes também.</p>
          <ul class="q-list"><li class="fav"><b>O Castelo Animado</b><small>o castelo que anda pelo vale</small></li><li class="fav"><b>A Viagem de Chihiro</b><small>o trem que corre sobre a água</small></li><li class="fav"><b>Meu Amigo Totoro</b><small>o pôster da parede da estante</small></li></ul>
          <p class="d-note">Este portfólio é uma homenagem a esses filmes. Personagens, castelo e músicas pertencem aos seus autores.</p>`,
      },
      jogos: {
        name: "Mesa", sub: "Jogos", k: "遊",
        view: { pos: [2.5, 2.2, 1.9], tgt: [5.6, 1.3, 0.4] },
        say: "Aqui é onde os mundos começam. Inclusive este.",
        html: () => `<span class="w-kicker">Mesa · jogos</span><h2 class="d-title">Jogos</h2>
          <p class="d-sub">Jogar e criar mundos.</p>
          <ul class="q-list"><li><b>Nós</b><small>narrativa de exploração psicológica, em desenvolvimento</small></li><li><b>Hollow Depths</b><small>RPG de turno guiado por probabilidade</small></li></ul>
          <div class="q-actions"><button type="button" class="w-btn" data-go-world="nos">Abrir a porta preta</button><a class="w-btn" href="https://game-nauy.onrender.com/" target="_blank" rel="noreferrer">Jogar Hollow Depths</a></div>`,
      },
      japao: {
        name: "Pergaminho", sub: "Japão", k: "日",
        view: { pos: [-1.5, 2.1, 0.5], tgt: [-1.75, 2.1, -4.6] },
        say: "旅 quer dizer jornada. É o mesmo kanji da placa do torii.",
        html: () => `<span class="w-kicker">Pergaminho · Japão</span><h2 class="d-title">Japão</h2>
          <p class="d-sub">Cultura, estética, kanji e caligrafia.</p>
          <ul class="q-list"><li><b>旅</b><small>jornada: o kanji da placa do torii e do pergaminho</small></li><li><b>ラテケ</b><small>Rateke em katakana, no selo vermelho</small></li><li><b>終点</b><small>fim da linha, na placa da estação</small></li></ul>
          <p class="d-note">Os kanji espalhados pelo vale marcam cada lugar: 城 castelo, 塔 torre, 汽 trem, 門 portão, 駅 estação.</p>`,
      },
      calcifer: {
        name: "Calcifer", sub: "o guia", k: "火",
        view: { pos: [-2.5, 1.4, -0.6], tgt: [-4.2, 0.75, -3.9] },
        say: "Eu cuido do fogo do castelo. E deste quarto, já que alguém precisa.",
        html: () => "",
      },
    };
    const ORDER = ["ghibli", "anime", "japao", "jogos"], SPAL = { ghibli: "sky", anime: "sakura", japao: "gold", jogos: "lavender" };
    function overviewHTML() { return ORDER.map((id) => `<section class="kc" data-c="${SPAL[id]}" data-k="${SPOTS[id].k}">${SPOTS[id].html()}</section>`).join(""); }

    function tex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.anisotropy = 4; return t; }
    const flat = (t) => new T.MeshBasicMaterial({ map: t });

    function build() {
      const mat = toon(env);
      const B = Builder(); const r = mulberry(12);
      const WOOD = "#5A3B26", WOOD_D = "#3A2618", PLASTER = "#D8C6A2";
      // piso de tatame
      for (let x = -6; x < 6; x += 2) for (let z = -4.5; z < 4; z += 1) {
        const c = (Math.floor(x / 2) + Math.floor(z)) % 2 ? "#BFAE72" : "#C9B87C";
        B.add(new T.BoxGeometry(1.96, 0.06, 0.96), M(x + 1, 0, z + 0.5), c);
      }
      B.add(new T.BoxGeometry(12.2, 0.04, 8.8), M(0, -0.03, -0.3), "#2E2218");
      // paredes, vigas e telhado inclinado
      const back = new T.Shape([new T.Vector2(-6, 0), new T.Vector2(6, 0), new T.Vector2(6, 3.2), new T.Vector2(0, 5.6), new T.Vector2(-6, 3.2)]);
      const hole = new T.Path(); hole.absarc(0, 2.75, 1.15, 0, Math.PI * 2, true); back.holes.push(hole);
      B.add(new T.ShapeGeometry(back, 24), M(0, 0, -4.5), PLASTER);
      for (const s of [-1, 1]) {
        B.add(new T.BoxGeometry(0.12, 3.2, 8.6), M(s * 6, 1.6, -0.2), PLASTER);
        B.add(new T.BoxGeometry(6.6, 0.12, 8.8), M(s * 3, 4.42, -0.2, 0, 0, -s * 0.3805), "#6B4A32");
        for (let z = -4.2; z <= 4; z += 1.4) B.add(new T.BoxGeometry(6.6, 0.18, 0.16), M(s * 3, 4.3, z, 0, 0, -s * 0.3805), WOOD_D);
        for (const y of [0.12, 3.12]) B.add(new T.BoxGeometry(0.14, 0.16, 8.6), M(s * 5.94, y, -0.2), WOOD_D);
        for (let z = -4.4; z <= 4; z += 2.1) B.add(new T.BoxGeometry(0.14, 3.2, 0.18), M(s * 5.92, 1.6, z), WOOD_D);
      }
      B.add(new T.BoxGeometry(0.24, 0.26, 8.8), M(0, 5.52, -0.2), WOOD_D);
      for (const x of [-4.4, -2.2, 2.2, 4.4]) B.add(new T.BoxGeometry(0.16, 3.2, 0.14), M(x, 1.6, -4.44), WOOD_D);
      B.add(new T.BoxGeometry(12, 0.16, 0.14), M(0, 0.1, -4.44), WOOD_D);
      // janela redonda com caixilho
      B.add(new T.TorusGeometry(1.17, 0.11, 8, 48), M(0, 2.75, -4.42), WOOD_D);
      B.add(new T.BoxGeometry(0.07, 2.3, 0.07), M(0, 2.75, -4.44), WOOD_D);
      B.add(new T.BoxGeometry(2.3, 0.07, 0.07), M(0, 2.75, -4.44), WOOD_D);
      B.add(new T.BoxGeometry(2.0, 0.1, 0.36), M(0, 1.55, -4.32), WOOD);
      // lareira de pedra (o lugar do Calcifer)
      const HX = -4.3, HZ = -3.75;
      B.add(new T.BoxGeometry(2.0, 0.3, 1.3), M(HX, 0.15, HZ), "#6E6872");
      for (const s of [-1, 1]) B.add(new T.BoxGeometry(0.42, 1.5, 0.9), M(HX + s * 0.78, 1.05, HZ - 0.15), (x, y) => (Math.floor(y * 4) % 2 ? "#7A6E66" : "#857A70"));
      B.add(new T.BoxGeometry(2.0, 0.5, 0.95), M(HX, 2.05, HZ - 0.15), "#7A6E66");
      B.add(new T.BoxGeometry(1.2, 2.4, 0.8), M(HX, 3.5, HZ - 0.3), "#6E6466");
      B.add(new T.BoxGeometry(1.2, 1.3, 0.1), M(HX, 0.95, HZ - 0.55), "#1C1412");
      B.add(new T.BoxGeometry(2.2, 0.12, 1.1), M(HX, 2.36, HZ - 0.1), WOOD);
      for (const [x, z, c] of [[-0.6, 0, "#7A5A3A"], [0.15, 0.1, "#3E5A6A"], [0.6, -0.05, "#B98A4A"]]) B.add(new T.CylinderGeometry(0.09, 0.1, 0.32, 10), M(HX + x, 2.58, HZ + z), c);
      // estante de mangá na parede esquerda
      const SX = -5.62;
      B.add(new T.BoxGeometry(0.06, 1.95, 3.4), M(SX - 0.22, 0.98, -0.3), WOOD_D);
      for (const z of [-2.0, 1.4]) B.add(new T.BoxGeometry(0.52, 1.95, 0.06), M(SX + 0.02, 0.98, z), WOOD);
      B.add(new T.BoxGeometry(0.56, 0.06, 3.46), M(SX + 0.02, 1.96, -0.3), WOOD);
      for (let s = 0; s < 4; s++) {
        const y = 0.06 + s * 0.48;
        B.add(new T.BoxGeometry(0.52, 0.05, 3.4), M(SX + 0.02, y, -0.3), WOOD_D);
        // volumes: cada prateleira uma série (cores das capas)
        const series = [["#F2EEE6", "#7FAE9A", "#E8E2D2"], ["#5A3E2E", "#9C2E2A", "#6E5A44"], ["#1C1A1E", "#B0202A", "#2A2830"], ["#C9A24A", "#3E4C86", "#7A5A2E"]][s];
        let z = -1.9;
        while (z < 1.25) { const w = 0.08 + r() * 0.03, h = 0.34 + r() * 0.06; B.add(new T.BoxGeometry(0.34, h, w), M(SX + 0.06, y + 0.03 + h / 2, z + w / 2), series[Math.floor(r() * 3)]); z += w + 0.004; }
      }
      // mesa, monitor, teclado e controle na parede direita
      const DX = 5.25;
      B.add(new T.BoxGeometry(1.0, 0.08, 2.6), M(DX, 1.0, 0.4), WOOD);
      for (const z of [-0.8, 1.6]) B.add(new T.BoxGeometry(0.9, 0.96, 0.06), M(DX, 0.5, z), WOOD_D);
      B.add(new T.BoxGeometry(0.1, 0.62, 1.1), M(DX + 0.3, 1.5, 0.4), "#222026");
      B.add(new T.BoxGeometry(0.08, 0.3, 0.1), M(DX + 0.32, 1.16, 0.4), "#222026");
      B.add(new T.BoxGeometry(0.3, 0.03, 0.9), M(DX - 0.15, 1.06, 0.4), "#3A3840");
      B.add(new T.BoxGeometry(0.22, 0.06, 0.34), M(DX - 0.2, 1.08, 1.4), "#2E2C36");
      for (const s of [-1, 1]) B.add(new T.SphereGeometry(0.08, 10, 8), M(DX - 0.22, 1.08, 1.4 + s * 0.17), "#2E2C36");
      B.add(new T.BoxGeometry(0.6, 0.07, 0.6), M(DX - 1.05, 0.62, -0.55, 0, 0.5, 0), "#7A2A26");
      B.add(new T.BoxGeometry(0.07, 0.7, 0.6), M(DX - 0.8, 1.0, -0.7, 0, 0.5, 0), "#7A2A26");
      B.add(new T.CylinderGeometry(0.04, 0.04, 0.6, 6), M(DX - 1.05, 0.3, -0.55), "#2E2C36");
      // mesinha baixa com chá e almofadas
      B.add(new T.BoxGeometry(1.6, 0.08, 1.0), M(0.2, 0.42, 1.2), WOOD);
      for (const [x, z] of [[-0.5, 0.8], [0.9, 0.8], [-0.5, 1.6], [0.9, 1.6]]) B.add(new T.BoxGeometry(0.08, 0.4, 0.08), M(x, 0.2, z), WOOD_D);
      B.add(new T.CylinderGeometry(0.13, 0.11, 0.2, 14), M(0.05, 0.56, 1.2), "#3E5A58");
      B.add(new T.CylinderGeometry(0.07, 0.06, 0.08, 12), M(0.45, 0.5, 1.05), "#E8DCC2");
      B.add(new T.CylinderGeometry(0.07, 0.06, 0.08, 12), M(0.5, 0.5, 1.4), "#E8DCC2");
      B.add(new T.BoxGeometry(0.8, 0.12, 0.8), M(-1.1, 0.08, 1.8, 0, 0.3, 0), "#8A3A34");
      B.add(new T.BoxGeometry(0.8, 0.12, 0.8), M(1.5, 0.08, 2.2, 0, -0.2, 0), "#3E4C66");
      scene.add(new T.Mesh(B.build(), mat));

      // vista pela janela: o vale no fim da tarde
      const view = tex(512, 512, (g, w, h) => {
        const sky = g.createLinearGradient(0, 0, 0, h * 0.62); sky.addColorStop(0, "#6F8FC6"); sky.addColorStop(0.6, "#E9B79A"); sky.addColorStop(1, "#F6D7A8");
        g.fillStyle = sky; g.fillRect(0, 0, w, h);
        g.fillStyle = "rgba(255,255,255,0.75)"; for (const [x, y, s] of [[120, 120, 40], [170, 110, 52], [220, 125, 38], [360, 90, 30], [395, 84, 40]]) { g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = "#8C9AB4"; g.beginPath(); g.moveTo(40, 330); g.lineTo(190, 190); g.lineTo(330, 330); g.fill();
        g.fillStyle = "#F4F1EC"; g.beginPath(); g.moveTo(150, 228); g.lineTo(190, 190); g.lineTo(230, 228); g.lineTo(205, 222); g.lineTo(190, 236); g.lineTo(172, 222); g.fill();
        g.fillStyle = "#9AA6BC"; g.beginPath(); g.moveTo(260, 330); g.lineTo(400, 214); g.lineTo(540, 330); g.fill();
        g.fillStyle = "#7FA864"; g.fillRect(0, 318, w, h);
        g.fillStyle = "#6A9656"; g.beginPath(); g.ellipse(120, 340, 220, 34, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#5E93B4"; g.beginPath(); g.ellipse(300, 372, 190, 16, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#C22026"; g.fillRect(286, 340, 4, 22); g.fillRect(304, 340, 4, 22); g.fillRect(280, 338, 34, 4);
        g.fillStyle = "#5B6E4E"; g.fillRect(0, 400, w, h);
      });
      const vm = new T.Mesh(new T.PlaneGeometry(3.4, 3.4), flat(view)); vm.position.set(0, 2.75, -4.62); scene.add(vm);

      // pôsteres (desenhados aqui, sem imagens dos filmes)
      const poster = (bg, draw, title) => tex(300, 420, (g, w, h) => {
        g.fillStyle = bg; g.fillRect(0, 0, w, h); draw(g, w, h);
        g.fillStyle = "rgba(255,255,255,0.92)"; g.font = `700 30px ${SERIF}`; g.textAlign = "center"; g.fillText(title, w / 2, h - 34);
        g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 4; g.strokeRect(10, 10, w - 20, h - 20);
      });
      const pCastle = poster("#6F9CC8", (g) => {
        g.fillStyle = "#7FA864"; g.fillRect(0, 290, 300, 130);
        g.fillStyle = "#6E5444"; g.beginPath(); g.ellipse(150, 200, 78, 58, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#8A6A52"; for (const [x, y, rr] of [[110, 160, 26], [190, 170, 30], [150, 140, 22]]) { g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = "#B8483A"; g.fillRect(120, 110, 18, 26); g.fillRect(168, 118, 16, 22);
        g.strokeStyle = "#4A3428"; g.lineWidth = 7; for (const x of [118, 140, 162, 184]) { g.beginPath(); g.moveTo(x, 250); g.lineTo(x + (x % 2 ? 8 : -8), 300); g.stroke(); }
        g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.arc(70, 70, 26, 0, Math.PI * 2); g.arc(100, 64, 30, 0, Math.PI * 2); g.fill();
      }, "動く城");
      const pTrain = poster("#E9A37C", (g) => {
        const s = g.createLinearGradient(0, 0, 0, 260); s.addColorStop(0, "#5E6FA6"); s.addColorStop(1, "#F1B48A"); g.fillStyle = s; g.fillRect(0, 0, 300, 260);
        g.fillStyle = "#4E8AA8"; g.fillRect(0, 250, 300, 170);
        g.fillStyle = "#7A2A26"; g.fillRect(40, 214, 200, 28); g.fillStyle = "#E8DCC2"; g.fillRect(40, 196, 200, 20);
        g.fillStyle = "#FFD58A"; for (let k = 0; k < 6; k++) g.fillRect(52 + k * 31, 200, 18, 12);
        g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 262); g.lineTo(300, 262); g.stroke();
      }, "千と千尋");
      const pTotoro = tex(420, 240, (g, w, h) => {
        g.fillStyle = "#24443E"; g.fillRect(0, 0, w, h);
        g.fillStyle = "#2E5A4A"; g.beginPath(); g.ellipse(210, 260, 260, 90, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#8C949C"; g.beginPath(); g.ellipse(210, 150, 62, 72, 0, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.moveTo(170, 98); g.lineTo(178, 52); g.lineTo(192, 92); g.fill(); g.beginPath(); g.moveTo(228, 92); g.lineTo(242, 52); g.lineTo(250, 98); g.fill();
        g.fillStyle = "#E8E2D2"; g.beginPath(); g.ellipse(210, 170, 42, 46, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#FFFFFF"; for (const x of [188, 232]) { g.beginPath(); g.arc(x, 118, 9, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = "#1C1A1E"; for (const x of [188, 232]) { g.beginPath(); g.arc(x, 118, 4.5, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = "#F4E6A0"; for (let k = 0; k < 14; k++) { g.globalAlpha = 0.5 + (k % 3) * 0.2; g.beginPath(); g.arc(30 + k * 28, 30 + (k * 37) % 70, 2.5, 0, Math.PI * 2); g.fill(); }
        g.globalAlpha = 1; g.fillStyle = "rgba(255,255,255,0.9)"; g.font = `700 26px ${SERIF}`; g.textAlign = "left"; g.fillText("トトロ", 24, h - 22);
      });
      const frames = new T.Group(); scene.add(frames);
      const hang = (t, w, h, pos, ry) => {
        const fr = new T.Mesh(new T.BoxGeometry(w + 0.1, h + 0.1, 0.04), new T.MeshBasicMaterial({ color: 0x2a1c14 }));
        const pm = new T.Mesh(new T.PlaneGeometry(w, h), flat(t)); pm.position.z = 0.025;
        const g = new T.Group(); g.add(fr, pm); g.position.set(...pos); g.rotation.y = ry; frames.add(g); return g;
      };
      hang(pCastle, 1.05, 1.47, [2.5, 2.05, -4.4], 0);
      hang(pTrain, 1.05, 1.47, [4.0, 1.95, -4.4], 0);
      hang(pTotoro, 1.6, 0.92, [-5.84, 2.55, -0.3], Math.PI / 2);
      // pergaminho com 旅
      const scroll = tex(160, 420, (g, w, h) => {
        g.fillStyle = "#EFE6D2"; g.fillRect(0, 0, w, h); g.fillStyle = "#3E5A58"; g.fillRect(0, 0, w, 30); g.fillRect(0, h - 30, w, 30);
        g.fillStyle = "#1C1718"; g.font = `800 112px ${SERIF}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("旅", w / 2, h * 0.42);
        g.fillStyle = "#C22026"; g.fillRect(w / 2 - 14, h - 92, 28, 28);
      });
      hang(scroll, 0.62, 1.62, [-1.75, 2.15, -4.4], 0);
      // tela do computador: um mundo começando
      const screen = tex(256, 160, (g, w, h) => {
        g.fillStyle = "#101826"; g.fillRect(0, 0, w, h);
        const px = 8; for (let x = 0; x < w; x += px) { const hh = 90 + Math.round(Math.sin(x * 0.05) * 10 + Math.sin(x * 0.13) * 6); g.fillStyle = "#3E6E4A"; g.fillRect(x, hh, px, h - hh); g.fillStyle = "#5A8C50"; g.fillRect(x, hh, px, px); }
        g.fillStyle = "#C22026"; g.fillRect(120, 64, 6, 28); g.fillRect(146, 64, 6, 28); g.fillRect(114, 60, 44, 6);
        g.fillStyle = "#FFD58A"; g.fillRect(30, 24, 10, 10);
        g.fillStyle = "#E8DCC2"; g.font = `500 13px ${MONO}`; g.fillText("> criar mundo_", 12, h - 12);
      });
      const sm = new T.Mesh(new T.PlaneGeometry(1.0, 0.54), flat(screen)); sm.position.set(DX + 0.24, 1.5, 0.4); sm.rotation.y = -Math.PI / 2; scene.add(sm);

      // Calcifer
      const cal = new T.Group(); cal.position.set(HX, 0.32, HZ - 0.15); scene.add(cal);
      const logs = Builder();
      logs.add(new T.CylinderGeometry(0.09, 0.09, 0.8, 8), M(0, 0.06, 0, 0, 0.5, Math.PI / 2), "#4A3020");
      logs.add(new T.CylinderGeometry(0.09, 0.09, 0.8, 8), M(0, 0.06, 0.05, 0, -0.5, Math.PI / 2), "#5A3B26");
      cal.add(new T.Mesh(logs.build(), mat));
      calc = makeCalcifer(0.82); calc.group.position.y = 0.02; cal.add(calc.group);

      // amuletos pendurados (como no quarto do castelo)
      const cm = toon(env);
      for (let k = 0; k < 7; k++) {
        const x = -2.6 + k * 0.85 + (r() - 0.5) * 0.3, z = -3.0 + r() * 1.2, len = 0.6 + r() * 0.8;
        const g = new T.Group(); g.position.set(x, 4.9 - Math.abs(x) * 0.3, z);
        const b = Builder();
        b.add(new T.CylinderGeometry(0.006, 0.006, len, 4), M(0, -len / 2, 0), "#2A2420");
        const c = ["#8FC6E0", "#E0B85A", "#C26A8A", "#9AD08A"][k % 4];
        b.add(new T.OctahedronGeometry(0.07 + r() * 0.04, 0), M(0, -len - 0.05, 0), c, 0.8);
        g.add(new T.Mesh(b.build(), cm)); scene.add(g); charms.push({ g, ph: r() * 6 });
      }

      // áreas de toque
      const hitBox = (id, size, pos) => { const m = new T.Mesh(new T.BoxGeometry(...size), new T.MeshBasicMaterial()); m.visible = false; m.position.set(...pos); m.userData.spot = id; scene.add(m); hits.push(m); };
      hitBox("anime", [0.8, 2.1, 3.6], [SX, 1.0, -0.3]);
      hitBox("ghibli", [2.8, 1.8, 0.4], [3.25, 2.0, -4.3]);
      hitBox("ghibli", [0.4, 1.1, 1.8], [-5.8, 2.55, -0.3]);
      hitBox("jogos", [1.4, 1.6, 2.8], [DX, 1.1, 0.4]);
      hitBox("japao", [0.9, 1.9, 0.4], [-1.75, 2.15, -4.3]);
      hitBox("calcifer", [1.3, 1.4, 1.0], [HX, 0.8, HZ]);

      env.uPL.value[0].set(HX, 0.9, HZ + 0.6); env.uPLC.value[0].set("#FF8A3A"); env.uPLR.value[0] = 2.2;
      env.uPL.value[1].set(DX - 0.4, 1.6, 0.4); env.uPLC.value[1].set("#5A82C0"); env.uPLR.value[1] = 0.9;
      env.uPL.value[2].set(0, 2.9, -3.6); env.uPLC.value[2].set("#B88A5E"); env.uPLR.value[2] = 2.4;

      tip = document.createElement("div"); tip.className = "w-label"; tip.style.opacity = "0";
    }

    let sayUntil = 0;
    const talking = () => performance.now() < sayUntil;
    function say(text) {
      sayUntil = performance.now() + Math.min(3200, 900 + text.length * 45);
      line.textContent = text; line.classList.remove("show"); void line.offsetWidth; line.classList.add("show");
    }
    const V = (a) => new T.Vector3(...a);
    const IDLE = { pos: [0, 2.3, 3.9], tgt: [0, 1.8, -2.0] };
    function bindDossier() {
      const body = $("dossierBody");
      body.querySelectorAll("[data-spot]").forEach((b) => b.addEventListener("click", () => select(b.dataset.spot)));
      body.querySelectorAll("[data-go-world]").forEach((b) => b.addEventListener("click", () => { const w = b.dataset.goWorld; const f = api.from; close(); open(w, f || "quarto"); }));
    }
    function select(id) {
      selected = id;
      const s = SPOTS[id];
      camFrom = { pos: camera.position.clone(), tgt: camera.userData.tgt.clone() }; camK = 0;
      say(s.say);
      $("dossierBody").innerHTML = overviewHTML(); $("dossierBody").dataset.start = Math.max(0, ORDER.indexOf(id)); bindDossier();
      hint.textContent = "";
      clearTimeout(sayTimer); sayTimer = setTimeout(() => { if (current === api && selected === id) showDossier(); }, 1300);
    }
    function deselect() {
      selected = null; hint.textContent = api.hintText;
      camFrom = { pos: camera.position.clone(), tgt: camera.userData.tgt.clone() }; camK = 0;
      $("dossierBody").innerHTML = overviewHTML(); bindDossier();
    }
    function pick(e) {
      const rc = canvas.getBoundingClientRect();
      ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const h = ray.intersectObjects(hits)[0];
      return h ? h.object.userData.spot : null;
    }
    const onMove = (e) => { if (e.target !== canvas) return; hovered = pick(e); canvas.style.cursor = hovered ? "pointer" : ""; };
    const onClick = (e) => { if (e.target !== canvas) return; const id = pick(e); if (id) select(id); };

    const api = {
      template: "", dossierLabel: "Ver todos os gostos", select: (id) => select(id), say: (t) => say(t),
      titleHTML: `<span class="w-kicker">Alto do castelo</span><span class="w-name">O quarto</span>`,
      hintText: "Toque no que chamar a sua atenção.",
      build,
      start() {
        time = 0; selected = null; hovered = null; camK = 1; camFrom = null;
        camera.position.set(...IDLE.pos); camera.userData.tgt = V(IDLE.tgt);
        labels.appendChild(tip);
        canvas.addEventListener("click", onClick); canvas.addEventListener("pointermove", onMove);
        $("worldAction").hidden = true;
        $("dossierBody").innerHTML = overviewHTML(); bindDossier();
        api.dossierReady = true; dossierBtn.hidden = false;
        api.onDossierClose = () => { if (selected) deselect(); };
        clearTimeout(sayTimer); sayTimer = setTimeout(() => { if (current === api && !selected) say("Ah, visita. Este é o quarto do Fernando."); }, 700);
      },
      stop() { clearTimeout(sayTimer); canvas.removeEventListener("click", onClick); canvas.removeEventListener("pointermove", onMove); canvas.style.cursor = ""; },
      resize(w, h) { camera.aspect = w / h; camera.fov = w / h < 0.9 ? 72 : 52; camera.updateProjectionMatrix(); },
      update(dt) {
        time += dt;
        // o fogo respira
        calc.U.uHot.value += ((hovered === "calcifer" ? 1 : 0) - calc.U.uHot.value) * Math.min(1, dt * 5);
        calc.update(dt, camera, talking());
        env.uPLC.value[0].setRGB(1.0, 0.54 + Math.sin(time * 7) * 0.04, 0.23).multiplyScalar(0.7 + Math.sin(time * 13) * 0.07 + (hovered === "calcifer" ? 0.2 : 0));
        charms.forEach((c) => { c.g.rotation.z = Math.sin(time * 0.9 + c.ph) * 0.08; c.g.rotation.x = Math.cos(time * 0.7 + c.ph) * 0.05; });
        // câmera
        const dest = selected ? SPOTS[selected].view : IDLE;
        const dp = V(dest.pos), dtg = V(dest.tgt);
        if (!selected) { dp.x += pointer.sx * 0.6; dp.y -= pointer.sy * 0.25; }
        camK = Math.min(1, camK + dt / 1.8);
        if (camK < 1 && camFrom) { const e = ease(camK); camera.position.copy(camFrom.pos).lerp(dp, e); camera.userData.tgt.copy(camFrom.tgt).lerp(dtg, e); }
        else { camera.position.lerp(dp, Math.min(1, dt * 3)); camera.userData.tgt.lerp(dtg, Math.min(1, dt * 3)); }
        camera.lookAt(camera.userData.tgt);
        // dica sobre o objeto
        if (hovered && !selected) {
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
      { id: "azul", color: "#2E7896", name: "Hollow Depths", sub: "abre o jogo", href: "https://game-nauy.onrender.com/", say: "Azul: as profundezas do Hollow Depths. Ele abre numa aba nova." },
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
    let spinBtn, time = 0, hovered = null, view = "idle", choiceIdx = -1, opening = 0, openK = 0, backK = 0, entryT = -1, calc = null, hits = [], sectors = [], doorHinge, backHinge, dialPtr, portalMat, plateTex, plateDraw, tip, stairTip, camFrom = null, camK = 1, sayUntil = 0, timer = null;
    const unlocked = () => { try { return sessionStorage.getItem(ROOM_KEY) === "1"; } catch (e) { return true; } };
    const talking = () => performance.now() < sayUntil;
    function say(text) { sayUntil = performance.now() + Math.min(3400, 900 + text.length * 45); line.textContent = text; line.classList.remove("show"); void line.offsetWidth; line.classList.add("show"); }
    function setView(v) { if (view === v) return; view = v; camFrom = { pos: camera.position.clone(), tgt: camera.userData.tgt.clone() }; camK = 0; }
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
      azul: (g, w, h) => {
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
      B.add(new T.BoxGeometry(0.22, 0.32, 0.22), M(BACKX + 1.1, 2.3, 4.92), "#FFC67A", 1);
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
      const act = $("worldAction"); act.hidden = false; act.textContent = d.back ? "Sair pela porta" : "Abrir a porta";
      spinBtn.hidden = false;
    }
    function openDoor() {
      if (choiceIdx < 0 || opening === 1) return;
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
    const onMove = (e) => { if (e.target !== canvas || entryT >= 0) return; hovered = pick(e); canvas.style.cursor = hovered ? "pointer" : ""; };
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
        canvas.addEventListener("click", onClick); canvas.addEventListener("pointermove", onMove);
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
        clearTimeout(timer); canvas.removeEventListener("click", onClick); canvas.removeEventListener("pointermove", onMove); canvas.style.cursor = "";
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
        if (view === "idle") { dp.x += pointer.sx * 0.6; dp.y -= pointer.sy * 0.25; }
        if (opening === 1) dp.lerp(new T.Vector3(1.6, 1.6, -3.6), openK * 0.6);
        camK = Math.min(1, camK + dt / (entryT >= 0 ? 2.1 : 1.8));
        if (camK < 1 && camFrom) { const e = ease(camK); camera.position.copy(camFrom.pos).lerp(dp, e); camera.userData.tgt.copy(camFrom.tgt).lerp(dtg, e); }
        else { camera.position.lerp(dp, Math.min(1, dt * 3)); camera.userData.tgt.lerp(dtg, Math.min(1, dt * 3)); }
        camera.lookAt(camera.userData.tgt);
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
    const camera = new T.PerspectiveCamera(50, 1, 0.1, 400);
    const env = envUniforms({ sun: [0.45, 0.8, 0.5], sunCol: "#E8D6A8", amb: "#4E5A48", fog: "#B9CDB0", fogDen: 0.016, glowCol: "#FFE6A8" });
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const MATS = [
      { id: "folhas", name: "Folhas", r: 4, cut: 7000, k: "葉" },
      { id: "papel", name: "Papel shōji", r: 8, cut: 3200, k: "紙" },
      { id: "madeira", name: "Madeira", r: 22, cut: 1000, k: "木" },
      { id: "pedra", name: "Pedra", r: 48, cut: 320, k: "石" },
    ];
    const SOURCES = [
      { id: "chuva", name: "Chuva", db: 60, k: "雨" },
      { id: "trem", name: "Trem passando", db: 80, k: "汽" },
      { id: "trovao", name: "Trovão", db: 100, k: "雷" },
    ];
    const SLEEP = 35;
    let time = 0, matIdx = 2, busy = false, slide = 0, slideTo = 0, wake = 0, wakeUntil = 0, totoro, chu, chibi, panels = [], zs = [], ctrl, meter, audio = null, sayUntil = 0, timer = null, motes;
    function say(text) { line.textContent = text; line.classList.remove("show"); void line.offsetWidth; line.classList.add("show"); }

    function build() {
      const mat = toon(env);
      scene.background = new T.Color("#CFE0C6");
      const B = Builder(); const r = mulberry(88);
      // chão de musgo e campo
      B.add(new T.CircleGeometry(60, 64), M(0, 0, 0, -Math.PI / 2, 0, 0), (x, y) => (Math.hypot(x, y) < 9 ? "#5E8A44" : "#6E9A4E"));
      // tronco da cânfora, com a toca aberta na frente
      const BARK = (x, y, z) => { const a = Math.atan2(x, z); const v = Math.sin(a * 9 + y * 0.9 + Math.sin(y * 1.7 + a * 3) * 1.5) * 0.5 + 0.5; return v > 0.7 ? "#5A4434" : v > 0.35 ? "#66503E" : "#715846"; };
      const gnarl = (geo, amp) => { const g = geo.index ? geo.toNonIndexed() : geo; const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z); const k = 1 + amp * (Math.sin(a * 5 + y * 0.7) * 0.6 + Math.sin(a * 11 - y * 1.3) * 0.4); p.setXYZ(i, x * k, y, z * k); } g.computeVertexNormals(); return g; };
      B.add(gnarl(new T.CylinderGeometry(3.0, 3.9, 4.4, 56, 8, true, 0.62, Math.PI * 2 - 1.24), 0.07), M(0, 2.2, 0), BARK);
      B.add(inwardM(new T.CylinderGeometry(2.7, 3.35, 4.4, 56, 4, true, 0.62, Math.PI * 2 - 1.24)), M(0, 2.2, 0), "#3E2C20");
      B.add(gnarl(new T.CylinderGeometry(2.95, 3.1, 1.6, 24, 3, true, -0.62, 1.24), 0.05), M(0, 3.7, 0), BARK);
      B.add(new T.CircleGeometry(3.3, 40), M(0, 0.04, 0, -Math.PI / 2, 0, 0), "#4E7A3A");
      for (const sx of [-1, 1]) B.add(new T.CylinderGeometry(0.35, 0.55, 3.2, 12), M(sx * 2.05, 1.5, 2.9, 0, 0, sx * 0.08), BARK);
      for (let k = 0; k < 7; k++) { const x = -1.8 + k * 0.6; B.add(new T.IcosahedronGeometry(0.42 + (k % 3) * 0.08, 1), M(x, 2.95 + Math.sin(k * 1.7) * 0.12, 2.92, 0, 0, 0, 1, 0.8, 0.7), BARK); }
      B.add(gnarl(new T.CylinderGeometry(2.2, 3.0, 7, 48, 10), 0.08), M(0, 7.9, 0), BARK);
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3; B.add(new T.CylinderGeometry(0.5, 0.9, 7, 10), M(Math.sin(a) * 3.2, 12.2, Math.cos(a) * 3.2, Math.cos(a) * 0.7, 0, -Math.sin(a) * 0.7), BARK); }
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + 0.35; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.5) continue; B.add(new T.CylinderGeometry(0.25, 0.7, 4.4, 8), M(Math.sin(a) * 4.4, 0.35, Math.cos(a) * 4.4, Math.cos(a) * 1.35, 0, -Math.sin(a) * 1.35), BARK); }
      // shimenawa (corda sagrada) com shide de papel
      B.add(new T.TorusGeometry(2.92, 0.17, 10, 64), M(0, 5.3, 0, Math.PI / 2, 0, 0), (x, y, z) => (Math.floor((Math.atan2(z, x) + Math.PI) * 12) % 2 ? "#E2CE96" : "#C9B278"));
      for (const a of [-0.6, -0.2, 0.2, 0.6]) {
        const x = Math.sin(a) * 3.05, z = Math.cos(a) * 3.05;
        for (let k = 0; k < 4; k++) B.add(new T.PlaneGeometry(0.12, 0.17), M(x + Math.sin(a + Math.PI / 2) * (k % 2 ? 0.05 : -0.05), 5.02 - k * 0.15, z + 0.02, 0, a, (k % 2 ? 0.5 : -0.5)), "#F7F4EC");
      }
      // copa enorme
      for (let k = 0; k < 52; k++) { const a = r() * Math.PI * 2, rr = r() * 10.5, y = 11 + r() * 5.5 - rr * 0.22; B.add(new T.IcosahedronGeometry(2.6 + r() * 2.2, 1), M(Math.cos(a) * rr, y, Math.sin(a) * rr * 0.9), ["#3E6E3E", "#4A7C46", "#5A8C50", "#36603A"][k % 4]); }
      // floresta ao redor
      for (let k = 0; k < 34; k++) {
        const a = k / 34 * Math.PI * 2 + r() * 0.1, rr = 26 + r() * 14, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
        if (z > 10 && Math.abs(x) < 16) continue;
        const h = 6 + r() * 6;
        B.add(new T.CylinderGeometry(0.4, 0.7, h, 8), M(x, h / 2, z), "#5A4434");
        for (let j = 0; j < 4; j++) B.add(new T.IcosahedronGeometry(2.4 + r() * 1.6, 1), M(x + (r() - 0.5) * 3, h + r() * 3, z + (r() - 0.5) * 3), ["#4A7C46", "#5A8C50", "#3E6E3E"][j % 3]);
      }
      // samambaias, pedras e flores
      for (let k = 0; k < 40; k++) { const a = r() * Math.PI * 2, rr = 4.6 + r() * 7; const x = Math.cos(a) * rr, z = Math.sin(a) * rr; if (z > 3 && Math.abs(x) < 3) continue; B.add(new T.ConeGeometry(0.35 + r() * 0.3, 0.9 + r() * 0.6, 5), M(x, 0.4, z, (r() - 0.5) * 0.3, r(), (r() - 0.5) * 0.3), r() < 0.5 ? "#4E8A3E" : "#6AA04E"); }
      for (let k = 0; k < 10; k++) { const a = r() * Math.PI * 2, rr = 5 + r() * 6; B.add(new T.IcosahedronGeometry(0.3 + r() * 0.4, 0), M(Math.cos(a) * rr, 0.15, Math.sin(a) * rr), "#8A8890"); }
      for (let k = 0; k < 60; k++) { const a = r() * Math.PI * 2, rr = 4 + r() * 9; B.add(new T.SphereGeometry(0.07, 6, 4), M(Math.cos(a) * rr, 0.12, Math.sin(a) * rr), ["#F4F0E2", "#F2D24A", "#E8A0B4"][k % 3]); }
      scene.add(new T.Mesh(B.build(), mat));
      const line2 = outline(0.035, "#2A2018", env);
      const envIn = Object.assign({}, env, { uSunCol: { value: new T.Color("#9A8A6E") }, uAmb: { value: new T.Color("#3A4038") } });
      const totoroMat = toon(envIn);
      // Totoro grande, o médio e o pequeno, dormindo na toca
      totoro = makeTotoro({ body: "#5E6672", belly: "#E2DAC4", s: 1.05, mat: totoroMat });
      totoro.g.position.set(0, 0.1, -0.7); totoro.g.rotation.x = -0.22; scene.add(totoro.g);
      chu = makeTotoro({ body: "#5E7EB4", belly: "#D6E0EE", s: 0.42, mat: totoroMat });
      chu.g.position.set(-1.55, 0.05, 0.6); chu.g.rotation.set(-0.1, 0.4, 0.25); scene.add(chu.g);
      chibi = makeTotoro({ body: "#ECECE6", belly: "#FFFFFF", s: 0.26, mat: totoroMat });
      chibi.g.position.set(0.05, 1.3, 0.25); chibi.g.rotation.set(-0.5, 0, 0); scene.add(chibi.g);
      [totoro, chu, chibi].forEach((t) => { const o = new T.Mesh(t.g.children[0].geometry, line2); t.g.add(o); });
      // barreiras que deslizam até a entrada
      MATS.forEach((m) => {
        const P = Builder();
        if (m.id === "folhas") { for (let k = 0; k < 26; k++) P.add(new T.BoxGeometry(0.16, 3.2, 0.05), M(-2 + k * 0.16, 1.6, (k % 2) * 0.05, 0, 0, Math.sin(k) * 0.05), k % 3 ? "#5E9A4A" : "#4A8040"); }
        if (m.id === "papel") { P.add(new T.BoxGeometry(4.2, 3.2, 0.05), M(0, 1.6, 0), "#F6F0DE"); for (let x = -2; x <= 2.01; x += 0.6) P.add(new T.BoxGeometry(0.07, 3.2, 0.1), M(x, 1.6, 0), "#6B4A32"); for (let y = 0.1; y <= 3.21; y += 0.62) P.add(new T.BoxGeometry(4.2, 0.07, 0.1), M(0, y, 0), "#6B4A32"); }
        if (m.id === "madeira") { for (let k = 0; k < 9; k++) P.add(new T.BoxGeometry(0.46, 3.2, 0.14), M(-1.86 + k * 0.465, 1.6, 0), k % 2 ? "#9A6A42" : "#8A5E3A"); P.add(new T.BoxGeometry(4.3, 0.18, 0.2), M(0, 0.6, 0.08), "#6B4A32"); P.add(new T.BoxGeometry(4.3, 0.18, 0.2), M(0, 2.6, 0.08), "#6B4A32"); }
        if (m.id === "pedra") { for (let y = 0; y < 5; y++) for (let x = 0; x < 6; x++) P.add(new T.BoxGeometry(0.66, 0.6, 0.4), M(-1.8 + x * 0.7 + (y % 2) * 0.32, 0.32 + y * 0.64, 0), (x + y) % 3 ? "#9A9690" : "#86827C"); }
        const pm = new T.Mesh(P.build(), mat); pm.visible = false; pm.position.set(5.6, 0, 3.75); scene.add(pm); panels.push(pm);
      });
      // Zzz
      const zt = (() => { const c = document.createElement("canvas"); c.width = 64; c.height = 64; const g = c.getContext("2d"); g.fillStyle = "#FFFFFF"; g.font = "700 50px 'Zen Maru Gothic', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("z", 32, 34); return new T.CanvasTexture(c); })();
      for (let k = 0; k < 3; k++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: zt, transparent: true, depthWrite: false })); sp.scale.setScalar(0.4); scene.add(sp); zs.push({ sp, ph: k / 3 }); }
      // poeira dourada nos raios de luz
      const mg = new T.BufferGeometry(), mp = []; for (let k = 0; k < 120; k++) mp.push((r() - 0.5) * 16, r() * 9, (r() - 0.5) * 10 + 4);
      mg.setAttribute("position", new T.Float32BufferAttribute(mp, 3));
      motes = new T.Points(mg, new T.PointsMaterial({ color: 0xfff2c0, size: 0.07, transparent: true, opacity: 0.8 })); scene.add(motes);
      env.uPL.value[0].set(0, 2.4, 0.6); env.uPLC.value[0].set("#FFD9A0"); env.uPLR.value[0] = 2.4;
      env.uPL.value[1].set(-6, 6, 6); env.uPLC.value[1].set("#FFF0C8"); env.uPLR.value[1] = 0.001;
      env.uPL.value[2].set(6, 6, 6); env.uPLC.value[2].set("#FFF0C8"); env.uPLR.value[2] = 0.001;

      // controles: barreira e barulho
      ctrl = document.createElement("div"); ctrl.className = "tt-ctrl";
      ctrl.innerHTML = `<div class="tt-group" role="group" aria-label="Barreira na entrada da toca"><span class="tt-label">Barreira</span>${MATS.map((m, i) => `<button type="button" class="tt-ema" data-mat="${i}" aria-pressed="${i === matIdx}"><b aria-hidden="true">${m.k}</b><span>${esc(m.name)}</span><small>isola ${m.r} dB</small></button>`).join("")}</div>
        <div class="tt-group" role="group" aria-label="Fazer barulho"><span class="tt-label">Barulho</span>${SOURCES.map((s, i) => `<button type="button" class="tt-ema tt-noise" data-src="${i}"><b aria-hidden="true">${s.k}</b><span>${esc(s.name)}</span><small>${s.db} dB</small></button>`).join("")}</div>`;
      ctrl.querySelectorAll("[data-mat]").forEach((b) => b.addEventListener("click", () => { matIdx = +b.dataset.mat; ctrl.querySelectorAll("[data-mat]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
      ctrl.querySelectorAll("[data-src]").forEach((b) => b.addEventListener("click", () => noise(+b.dataset.src)));
      meter = document.createElement("div"); meter.className = "w-label tt-meter"; meter.style.opacity = "0";
    }
    function inwardM(geo) {
      const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals();
      const p = g.attributes.position.array, n = g.attributes.normal.array;
      for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) { const a = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = a; const b2 = n[i + 3 + k]; n[i + 3 + k] = n[i + 6 + k]; n[i + 6 + k] = b2; }
      for (let i = 0; i < n.length; i++) n[i] = -n[i];
      return g;
    }

    // sons sintetizados, abafados pela barreira
    function play(src, m, inside) {
      try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        if (audio.state === "suspended") audio.resume();
        const ctx = audio, now = ctx.currentTime, dur = 3.0;
        const out = ctx.createGain(); out.gain.value = Math.min(0.9, Math.pow(10, (inside - 85) / 30));
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = m.cut; lp.connect(out); out.connect(ctx.destination);
        const nb = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate), d = nb.getChannelData(0);
        if (src.id === "chuva") { for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (0.5 + 0.5 * Math.random() * (Math.random() < 0.002 ? 4 : 1)); }
        else if (src.id === "trovao") { let l = 0; for (let i = 0; i < d.length; i++) { const t = i / ctx.sampleRate; l = (l + 0.04 * (Math.random() * 2 - 1)) / 1.04; d[i] = (t < 0.08 ? (Math.random() * 2 - 1) : l * 6) * Math.exp(-t * 1.1) * (1 + 0.6 * Math.sin(t * 7)); } }
        else { let l = 0; for (let i = 0; i < d.length; i++) { const t = i / ctx.sampleRate; l = (l + 0.03 * (Math.random() * 2 - 1)) / 1.03; const clack = (t % 0.42 < 0.03 || (t + 0.13) % 0.42 < 0.03) ? (Math.random() * 2 - 1) * 1.4 : 0; d[i] = l * 4 + clack; } }
        const s = ctx.createBufferSource(); s.buffer = nb;
        const env2 = ctx.createGain(); env2.gain.setValueAtTime(0, now); env2.gain.linearRampToValueAtTime(1, now + 0.15); env2.gain.setValueAtTime(1, now + dur - 0.6); env2.gain.linearRampToValueAtTime(0, now + dur);
        s.connect(env2); env2.connect(lp); s.start(now);
      } catch (e) { /* sem áudio */ }
    }
    function noise(i) {
      if (busy) return;
      busy = true;
      const src = SOURCES[i], m = MATS[matIdx], inside = Math.max(0, src.db - m.r);
      panels.forEach((p, j) => { p.visible = j === matIdx; });
      slideTo = 1;
      ctrl.classList.add("busy");
      setTimeout(() => {
        if (current !== api) return;
        play(src, m, inside);
        meter.innerHTML = `<b>Dentro da toca: ${inside} dB</b><span>${src.name} ${src.db} dB · ${m.name} isola ${m.r} dB</span>`;
        meter.style.opacity = "1";
        const woke = inside > SLEEP;
        setTimeout(() => {
          if (current !== api) return;
          if (woke) { wake = 1; wakeUntil = time + 3.6; say(i === 2 && matIdx === 3 ? `Nem a pedra segura um trovão: ${inside} dB. Acordaram.` : `${inside} dB lá dentro. O Totoro acordou.`); }
          else say(`${inside} dB lá dentro. Ninguém acordou.`);
        }, 700);
        setTimeout(() => { if (current !== api) return; slideTo = 0; }, 3100);
        setTimeout(() => { if (current !== api) return; busy = false; ctrl.classList.remove("busy"); }, 4200);
      }, 900);
    }

    const api = {
      template: "dossierArvore", dossierLabel: "Ver a história do AcousticBuild", kamiColor: "totoro",
      noise: (i) => noise(i), mat: (i) => { matIdx = i; },
      titleHTML: `<span class="w-kicker">Porta vermelha · AcousticBuild</span><span class="w-name">O sono do Totoro</span>`,
      hintText: "Escolha a barreira da toca e faça barulho. Acima de 35 dB, eles acordam.",
      build,
      start() {
        time = 0; busy = false; slide = 0; slideTo = 0; wake = 0;
        camera.position.set(0, 5.0, 14); camera.userData = { tgt: new T.Vector3(0, 2.9, 0) };
        document.querySelector(".world-bottom").insertBefore(ctrl, document.querySelector(".world-actions"));
        ctrl.classList.remove("busy");
        labels.appendChild(meter); meter.style.opacity = "0";
        $("worldAction").hidden = true;
        api.dossierReady = true; dossierBtn.hidden = false;
        clearTimeout(timer); timer = setTimeout(() => { if (current === api) say("Shh. Eles estão dormindo."); }, 600);
      },
      stop() { clearTimeout(timer); if (ctrl.parentNode) ctrl.parentNode.removeChild(ctrl); },
      resize(w, h) { camera.aspect = w / h; camera.fov = w / h < 0.9 ? 70 : 50; camera.updateProjectionMatrix(); },
      update(dt) {
        time += dt;
        slide += (slideTo - slide) * Math.min(1, dt * 3.2);
        panels.forEach((p) => { p.position.x = lerp(5.6, 0, ease(Math.min(1, Math.max(0, slide)))); });
        if (wake && time > wakeUntil) wake = 0;
        const w = wake;
        [totoro, chu, chibi].forEach((t, i) => { t.eyesOpen.visible = !!w; t.eyesShut.visible = !w; });
        // respiração e sustos
        const br = Math.sin(time * 1.3);
        totoro.g.scale.set(1.05 * (1 + br * 0.012), 1.05 * (1 + br * 0.018), 1.05 * (1 + br * 0.012));
        totoro.g.rotation.x = -0.22 + (w ? 0.18 : 0);
        chibi.g.position.y = 1.3 + Math.max(0, br) * 0.03 + (w ? Math.abs(Math.sin(time * 9)) * 0.35 : 0);
        chu.g.position.y = 0.05 + (w ? Math.abs(Math.sin(time * 8 + 1)) * 0.25 : 0);
        zs.forEach((z) => { const k = (time * 0.35 + z.ph) % 1; z.sp.position.set(0.6 + k * 0.9 + Math.sin(k * 6) * 0.15, 2.9 + k * 1.6, 0.4); z.sp.material.opacity = w || slide > 0.2 ? 0 : Math.sin(k * Math.PI) * 0.9; z.sp.scale.setScalar(0.25 + k * 0.35); });
        motes.rotation.y = time * 0.02; motes.position.y = Math.sin(time * 0.3) * 0.2;
        // câmera
        const pos = new T.Vector3(pointer.sx * 1.2, 5.0 - pointer.sy * 0.5, 14);
        camera.position.lerp(pos, Math.min(1, dt * 2)); camera.lookAt(camera.userData.tgt);
        const v = new T.Vector3(0, 4.6, 3).project(camera);
        meter.style.transform = `translate(-50%, -100%) translate(${(v.x * 0.5 + 0.5) * W}px, ${(-v.y * 0.5 + 0.5) * H}px)`;
      },
      render(rr) { rr.setRenderTarget(null); rr.render(scene, camera); },
    };
    return api;
  })();

  const worlds = { nos, torre, trem, quarto, castelo, arvore };
  window.mundos = { open, close, worlds };
})();
