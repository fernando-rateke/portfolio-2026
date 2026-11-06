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
  function showDossier() {
    dossier.hidden = false; dossierBtn.hidden = true;
    requestAnimationFrame(() => dossier.classList.add("open"));
    dossier.focus();
  }
  function hideDossier() { dossier.classList.remove("open"); dossier.hidden = true; }
  dossierBtn.addEventListener("click", showDossier);
  $("dossierClose").addEventListener("click", () => {
    hideDossier();
    if (current && current.onDossierClose) current.onDossierClose();
    if (current && current.dossierReady) dossierBtn.hidden = false;
  });

  function open(name) {
    const w = worlds[name];
    if (!w) return;
    if (name === "nos" && !w.entered) { showGate(); return; }
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
  $("worldBack").addEventListener("click", close);
  addEventListener("keydown", (e) => { if (e.key === "Escape" && current) close(); });

  // aviso antes da porta preta
  const gate = $("worldGate");
  function showGate() { gate.hidden = false; root.classList.add("intro-on"); $("gateEnter").focus(); }
  $("gateEnter").addEventListener("click", () => { gate.hidden = true; worlds.nos.entered = true; open("nos"); });
  $("gateBack").addEventListener("click", () => { gate.hidden = true; if (!current) root.classList.remove("intro-on"); });

  /* =================================================================== */
  /* TEMPLO DO SINO                                                       */
  /* =================================================================== */
  const templo = (() => {
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(40, 1, 0.1, 3000);
    const env = envUniforms({ sun: [-0.75, 0.32, -0.55], sunCol: "#FFD7A8", amb: "#5A5470", fog: "#E7B48F", fogDen: 0.006, glowCol: "#FFC67A" });
    const line1 = outline(0.035, "#2A1D18", env);
    const WALLS = [
      { x: 6.5, name: "Papel", sub: "shōji", R: 8, color: "#F3ECDB" },
      { x: 10.5, name: "Madeira", sub: "tábuas de 2 cm", R: 22, color: "#9A6B47" },
      { x: 14.5, name: "Pedra", sub: "20 cm", R: 48, color: "#8E8B84" },
    ];
    const SRC_DB = 95;
    const BELL = new T.Vector3(0, 2.55, 0);
    const waves = [-100, -100, -100, -100];
    let waveIdx = 0, time = 0, strikeT = -10, struck = false, audio = null;
    let striker, bellGroup, ringMat, wallMats = [], labelEls = [];
    const levels = [];
    {
      let prevX = 1, L = SRC_DB;
      for (const w of WALLS) { const Lin = L - 20 * Math.log10(w.x / prevX); const Lout = Lin - w.R; levels.push([Lin, Lout]); L = Lout; prevX = w.x; }
    }

    function build() {
      // céu do entardecer
      const sky = new T.Mesh(new T.SphereGeometry(1500, 40, 20), new T.ShaderMaterial({
        side: T.BackSide, depthWrite: false,
        uniforms: { uSunDir: { value: new T.Vector3(-0.75, 0.1, -0.65).normalize() } },
        vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `${NOISE} uniform vec3 uSunDir; varying vec3 vD;
          void main(){
            vec3 d=normalize(vD); float y=d.y;
            vec3 top=vec3(0.17,0.25,0.47), mid=vec3(0.86,0.52,0.42), low=vec3(0.98,0.79,0.55);
            vec3 c=mix(low,mid,smoothstep(0.0,0.18,y)); c=mix(c,top,smoothstep(0.16,0.7,y));
            float s=max(dot(d,uSunDir),0.0);
            c+=vec3(1.0,0.75,0.45)*pow(s,8.0)*0.55+vec3(1.0,0.95,0.8)*smoothstep(0.9985,0.9992,s);
            float band=snoise(vec2(atan(d.z,d.x)*3.0,y*14.0))*0.5+0.5;
            float clouds=smoothstep(0.62,0.8,band)*smoothstep(0.03,0.1,y)*smoothstep(0.32,0.14,y);
            c=mix(c,mix(vec3(0.98,0.66,0.6),vec3(1.0,0.86,0.7),pow(s,3.0)),clouds*0.75);
            gl_FragColor=vec4(c,1.0);
          }`,
      }));
      sky.renderOrder = -1; scene.add(sky); scene.userData.sky = sky;

      // pátio de cascalho rastelado em círculos, musgo nas bordas
      const ground = new T.Mesh(new T.CircleGeometry(160, 120), new T.ShaderMaterial({
        uniforms: env,
        vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
        fragmentShader: `${NOISE} uniform vec3 uSun, uSunCol, uAmb, uFog; uniform float uFogDen; varying vec3 vW;
          void main(){
            float r=length(vW.xz);
            float rake=sin(r*7.5)*0.5+0.5;
            vec3 gravel=mix(vec3(0.72,0.68,0.6),vec3(0.83,0.79,0.71),smoothstep(0.3,0.7,rake));
            gravel*=0.94+0.06*snoise(vW.xz*6.0);
            vec3 moss=mix(vec3(0.33,0.42,0.26),vec3(0.42,0.52,0.3),snoise(vW.xz*0.3)*0.5+0.5);
            vec3 c=mix(gravel,moss,smoothstep(17.0,21.0,r+snoise(vW.xz*0.2)*2.0));
            c*=uAmb*0.9+uSunCol*0.55;
            float d=length(vW-cameraPosition); c=mix(c,uFog,1.0-exp(-d*uFogDen));
            gl_FragColor=vec4(c,1.0);
          }`,
      }));
      ground.rotation.x = -Math.PI / 2; scene.add(ground);

      const mat = toon(env);
      // pavilhão do sino (shōrō)
      const B = Builder();
      const WOOD = "#6B3A2A", WOOD_D = "#4E2A1F", STONE = "#9B968B", STONE_D = "#7F7A70", ROOF = "#3B4350";
      B.add(new T.BoxGeometry(6.8, 0.7, 5.6), M(0, 0.35, 0), STONE);
      B.add(new T.BoxGeometry(7.2, 0.18, 6.0), M(0, 0.05, 0), STONE_D);
      for (let i = 0; i < 3; i++) B.add(new T.BoxGeometry(2.2, 0.22, 0.5), M(0, 0.11 + i * 0.22, 3.0 + 0.5 * (2 - i) * 0.6), STONE);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        B.add(new T.CylinderGeometry(0.15, 0.18, 3.7, 12), M(sx * 2.7, 2.55, sz * 2.1), WOOD);
        B.add(new T.CylinderGeometry(0.26, 0.3, 0.2, 10), M(sx * 2.7, 0.8, sz * 2.1), STONE_D);
      }
      for (const sz of [-1, 1]) B.add(new T.BoxGeometry(5.9, 0.22, 0.22), M(0, 4.2, sz * 2.1), WOOD_D);
      for (const sx of [-1, 1]) B.add(new T.BoxGeometry(0.22, 0.22, 4.7), M(sx * 2.7, 4.2, 0), WOOD_D);
      B.add(new T.BoxGeometry(0.24, 0.26, 4.6), M(0, 4.05, 0), WOOD_D);       // viga do sino
      B.add(new T.BoxGeometry(5.6, 0.14, 0.16), M(0, 1.25, 2.1), WOOD);        // guarda-corpo
      B.add(new T.BoxGeometry(5.6, 0.14, 0.16), M(0, 1.25, -2.1), WOOD);
      // telhado de quatro águas com beirais curvados
      const roofGeo = (under) => {
        const N = 28, g = new T.BufferGeometry(), pos = [];
        const h = (u, v) => { const m = Math.max(Math.abs(u), Math.abs(v)); return 1.55 * Math.pow(1 - m, 0.85) + 0.42 * Math.pow(m, 6) * (0.4 + Math.abs(u * v)); };
        const P = (u, v) => [u * 4.0, 4.35 + h(u, v), v * 3.4];
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
          const u0 = -1 + 2 * i / N, u1 = -1 + 2 * (i + 1) / N, v0 = -1 + 2 * j / N, v1 = -1 + 2 * (j + 1) / N;
          const a = P(u0, v0), b = P(u1, v0), c = P(u0, v1), d = P(u1, v1);
          if (under) pos.push(...a, ...b, ...c, ...b, ...d, ...c); else pos.push(...a, ...c, ...b, ...b, ...c, ...d);
        }
        g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
        return g;
      };
      const roof = roofGeo(false);
      B.add(roof, M(), (x, y, z) => ((Math.max(Math.abs(x) / 4, Math.abs(z) / 3.4) * 18 | 0) % 2 ? ROOF : "#4A5361"));
      B.add(roofGeo(true), M(0, -0.12, 0), "#5A3A2C");
      B.add(new T.BoxGeometry(0.9, 0.22, 0.3), M(0, 5.95, 0), "#2A2F38");
      for (const sx of [-1, 1]) B.add(new T.ConeGeometry(0.16, 0.42, 4), M(sx * 0.5, 6.1, 0, 0, Math.PI / 4, sx * 0.4), "#2A2F38");
      const pav = new T.Mesh(B.build(), mat); scene.add(pav); scene.add(new T.Mesh(pav.geometry, line1));

      // o sino (bonshō): perfil de bronze, faixas, saliências e o assento do golpe
      bellGroup = new T.Group(); bellGroup.position.set(0, 3.95, 0); scene.add(bellGroup);
      const BB = Builder();
      const BRONZE = "#6E5A3C", PATINA = "#577365";
      const prof = [[0.0, 0.0], [0.28, -0.02], [0.52, -0.12], [0.6, -0.4], [0.62, -1.2], [0.66, -1.62], [0.72, -1.72], [0.66, -1.74], [0.58, -1.72]].map(([r, y]) => new T.Vector2(r, y));
      BB.add(new T.LatheGeometry(prof, 48), M(), (x, y) => (y < -1.45 ? BRONZE : ((x * 9 | 0) & 1) && y > -1.1 ? PATINA : BRONZE));
      for (const y of [-0.42, -1.12, -1.42]) BB.add(new T.TorusGeometry(0.615, 0.03, 8, 48), M(0, y, 0, Math.PI / 2, 0, 0), BRONZE);
      for (let a = 0; a < 4; a++) for (let rr = 0; rr < 3; rr++) for (let cc = 0; cc < 3; cc++) {
        const ang = a * Math.PI / 2 + Math.PI / 4 + (cc - 1) * 0.13;
        BB.add(new T.SphereGeometry(0.035, 8, 6), M(Math.cos(ang) * 0.605, -0.55 - rr * 0.16, Math.sin(ang) * 0.605), BRONZE);
      }
      BB.add(new T.CylinderGeometry(0.16, 0.16, 0.04, 16), M(-0.64, -1.3, 0, 0, 0, Math.PI / 2), "#8A7448");
      BB.add(new T.TorusGeometry(0.16, 0.06, 10, 20), M(0, 0.14, 0, 0, Math.PI / 2, 0), BRONZE);
      const bellMesh = new T.Mesh(BB.build(), mat); bellGroup.add(bellMesh); bellGroup.add(new T.Mesh(bellMesh.geometry, line1));

      // tronco de golpe (shumoku) pendurado por cordas
      striker = new T.Group(); striker.position.set(-1.7, 4.05, 0); scene.add(striker);
      const SB = Builder();
      SB.add(new T.CylinderGeometry(0.16, 0.16, 1.7, 16), M(0, -1.45, 0, 0, 0, Math.PI / 2), "#B08A5E");
      SB.add(new T.CylinderGeometry(0.17, 0.17, 0.04, 16), M(0.85, -1.45, 0, 0, 0, Math.PI / 2), "#8A6A44");
      for (const x of [-0.6, 0.6]) SB.add(new T.CylinderGeometry(0.018, 0.018, 1.45, 5), M(x, -0.72, 0), "#D9C9A0");
      for (const x of [-0.6, 0.6]) SB.add(new T.TorusGeometry(0.17, 0.02, 6, 16), M(x, -1.45, 0, 0, Math.PI / 2, 0), "#D9C9A0");
      const sMesh = new T.Mesh(SB.build(), mat); striker.add(sMesh); striker.add(new T.Mesh(sMesh.geometry, line1));

      // paredes de três materiais
      WALLS.forEach((w, i) => {
        const WB = Builder();
        const width = 7.2, h = 3.4;
        if (i === 0) {
          WB.add(new T.BoxGeometry(0.14, h, width), M(0, h / 2, 0), "#F3ECDB", 0.35);
          for (let k = -6; k <= 6; k++) WB.add(new T.BoxGeometry(0.2, h + 0.1, 0.05), M(0, h / 2, k * (width / 12)), "#7A5236");
          for (let k = 1; k < 6; k++) WB.add(new T.BoxGeometry(0.2, 0.05, width), M(0, k * h / 6, 0), "#7A5236");
        } else if (i === 1) {
          for (let k = 0; k < 18; k++) WB.add(new T.BoxGeometry(0.2, h, width / 18 - 0.02), M(0, h / 2, -width / 2 + (k + 0.5) * width / 18), k % 2 ? "#9A6B47" : "#8A5E3E");
        } else {
          const r = mulberry(9);
          for (let row = 0; row < 7; row++) for (let k = 0; k < 9; k++) {
            const off = (row % 2) * 0.4;
            WB.add(new T.BoxGeometry(0.34, h / 7 - 0.05, width / 9 - 0.06), M(0, (row + 0.5) * h / 7, -width / 2 + (k + 0.5) * width / 9 + off - 0.2), r() > 0.5 ? "#8E8B84" : "#7E7B74");
          }
        }
        WB.add(new T.BoxGeometry(0.5, 0.2, width + 0.4), M(0, 0.1, 0), "#6F6A60");
        const wm = toon(env); wallMats.push(wm);
        const mesh = new T.Mesh(WB.build(), wm); mesh.position.set(w.x, 0, 0); scene.add(mesh);
        const lm = new T.Mesh(mesh.geometry, line1); lm.position.copy(mesh.position); scene.add(lm);
      });

      // lanternas, pinheiros e colinas
      const DB = Builder(); const r = mulberry(3);
      for (const [x, z] of [[-4.8, -4.6], [4.6, -4.6]]) {
        DB.add(new T.CylinderGeometry(0.2, 0.32, 1.2, 8), M(x, 0.6, z), "#9A988E");
        DB.add(new T.BoxGeometry(0.62, 0.55, 0.62), M(x, 1.48, z), "#9A988E");
        DB.add(new T.BoxGeometry(0.3, 0.28, 0.64), M(x, 1.5, z), "#FFD58A", 1);
        DB.add(new T.ConeGeometry(0.72, 0.45, 4), M(x, 2.0, z, 0, Math.PI / 4, 0), "#7F7D74");
      }
      for (const [x, z, s] of [[-9, -6, 1.2], [-11, 3, 1.0], [-7, -11, 1.4], [3, -10, 1.1], [19, -8, 1.3], [-14, -14, 1.5], [9, -14, 1.2]]) {
        DB.add(new T.CylinderGeometry(0.16 * s, 0.26 * s, 3.6 * s, 7), M(x, 1.8 * s, z, 0, 0, (r() - 0.5) * 0.2), "#4E3A2E");
        for (let k = 0; k < 4; k++) DB.add(new T.ConeGeometry((1.6 - k * 0.3) * s, 0.9 * s, 8), M(x + (r() - 0.5) * 0.5, (2.6 + k * 0.75) * s, z), k % 2 ? "#2E4A3A" : "#38573F");
      }
      scene.add(new T.Mesh(DB.build(), mat));
      const hills = new T.Mesh(new T.BufferGeometry(), mat);
      {
        const HB = Builder();
        for (let k = 0; k < 9; k++) HB.add(new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(-120 + k * 34, -2, -120 - (k % 3) * 25, 0, 0, 0, 40 + (k % 4) * 10, 14 + (k % 3) * 8, 26), k % 2 ? "#6E6A86" : "#7E7591");
        hills.geometry = HB.build();
      }
      scene.add(hills);

      // ondas de som: anéis no ar (altura do sino) e no chão, atenuados por parede
      ringMat = new T.ShaderMaterial({
        transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
        uniforms: { uTime: { value: 0 }, uWaves: { value: new T.Vector4(-100, -100, -100, -100) }, uWallX: { value: new T.Vector3(...WALLS.map((w) => w.x)) },
          uWallT: { value: new T.Vector3(...WALLS.map((w) => Math.pow(10, -w.R / 20))) }, uGain: { value: 1 } },
        vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
        fragmentShader: `uniform float uTime; uniform vec4 uWaves; uniform vec3 uWallX; uniform vec3 uWallT; uniform float uGain; varying vec3 vW;
          float trans(float x){ float t=1.0; if(x>uWallX.x) t*=uWallT.x; if(x>uWallX.y) t*=uWallT.y; if(x>uWallX.z) t*=uWallT.z; return t; }
          void main(){
            float d=length(vW.xz); float a=0.0;
            for(int i=0;i<4;i++){
              float age=uTime-uWaves[i];
              if(age<0.0||age>6.5) continue;
              for(int k=0;k<4;k++){
                float r=age*4.6-float(k)*0.75; if(r<0.7) continue;
                float w=0.1+0.04*float(k);
                a+=exp(-pow((d-r)/w,2.0))*(1.0-float(k)*0.22)*(1.0-age/6.5)*2.4/(1.0+d*0.12);
              }
            }
            a*=sqrt(trans(vW.x))*uGain;
            a*=smoothstep(24.0,15.0,d)*smoothstep(0.6,1.1,d);
            vec3 col=mix(vec3(1.0,0.72,0.35),vec3(1.0,0.96,0.86),clamp(a,0.0,1.0));
            gl_FragColor=vec4(col*a,a);
          }`,
      });
      const air = new T.Mesh(new T.CircleGeometry(26, 160), ringMat); air.rotation.x = -Math.PI / 2; air.position.y = BELL.y - 0.6; scene.add(air);
      const floor = new T.Mesh(new T.CircleGeometry(26, 160), ringMat); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.04; scene.add(floor);
      const floor2 = new T.Mesh(new T.CircleGeometry(26, 160), ringMat); floor2.rotation.x = -Math.PI / 2; floor2.position.y = 0.74; scene.add(floor2);

      env.uPL.value[0].set(-4.8, 1.5, -4.0); env.uPLC.value[0].set("#C98A4A"); env.uPLR.value[0] = 1.6;
      env.uPL.value[1].set(4.6, 1.5, -4.0); env.uPLC.value[1].set("#C98A4A"); env.uPLR.value[1] = 1.6;
      env.uPL.value[2].copy(BELL); env.uPLC.value[2].set("#FFD08A"); env.uPLR.value[2] = 0.001;

      // rótulos das paredes e do sino
      const mk = (cls, html) => { const d = document.createElement("div"); d.className = "w-label " + cls; d.innerHTML = html; return d; };
      labelEls = [mk("src", `<b>Sino</b><span>${SRC_DB} dB a 1 m</span>`)].concat(WALLS.map((w) => mk("wall", `<b>${w.name}</b><span>${w.sub}</span><span>isola ${w.R} dB</span><em></em>`)));
    }

    // som de sino de templo sintetizado: parciais inarmônicos com batimento e decaimento longo
    function bellSound() {
      try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        if (audio.state === "suspended") audio.resume();
        const ctx = audio, now = ctx.currentTime + 0.01;
        const master = ctx.createGain(); master.gain.value = 0.0; master.connect(ctx.destination);
        master.gain.setValueAtTime(0, now); master.gain.linearRampToValueAtTime(0.5, now + 0.006); master.gain.setTargetAtTime(0.0001, now + 0.4, 3.2);
        const f0 = 98;
        [[0.5, 1.0, 12], [1, 0.75, 9], [1.183, 0.42, 6.5], [1.506, 0.34, 5], [2.0, 0.36, 4.5], [2.514, 0.2, 3], [3.011, 0.16, 2.4], [4.166, 0.09, 1.5], [5.43, 0.05, 0.9]].forEach(([r, a, dec]) => {
          for (const det of [-0.11, 0.11]) {
            const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f0 * r * (1 + det / 100);
            const gn = ctx.createGain(); gn.gain.setValueAtTime(0, now); gn.gain.linearRampToValueAtTime(a * 0.45, now + 0.004); gn.gain.exponentialRampToValueAtTime(0.0001, now + dec);
            o.connect(gn); gn.connect(master); o.start(now); o.stop(now + dec + 0.1);
          }
        });
        const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.09), ctx.sampleRate), dd = buf.getChannelData(0);
        for (let i = 0; i < dd.length; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / dd.length, 3);
        const ns = ctx.createBufferSource(); ns.buffer = buf;
        const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = 0.7;
        const ng = ctx.createGain(); ng.gain.value = 0.5; ns.connect(bp); bp.connect(ng); ng.connect(master); ns.start(now);
      } catch (e) { /* sem áudio */ }
    }

    function strike() {
      if (time - strikeT < 1.4) return;
      strikeT = time;
    }
    function onHit() {
      waves[waveIdx % 4] = time; waveIdx++;
      bellSound();
      bellGroup.userData.swing = 0.06;
      env.uPLR.value[2] = 4.5;
      labelEls.forEach((l) => l.classList.remove("hit"));
      if (!struck) {
        struck = true;
        hint.textContent = "Repare como cada parede segura parte do som.";
        setTimeout(() => { if (current === api) { dossierBtn.hidden = false; api.dossierReady = true; } }, 3800);
      }
    }
    const onClick = (e) => { if (e.target === canvas) strike(); };

    const api = {
      template: "dossierTemplo", dossierLabel: "Abrir o dossiê do AcousticBuild",
      titleHTML: `<span class="w-kicker">Porta vermelha</span><span class="w-name">Templo do Sino</span>`,
      hintText: "Toque no sino.",
      build,
      start() {
        time = 0; strikeT = -10; struck = false; api.dossierReady = false;
        for (let i = 0; i < 4; i++) waves[i] = -100;
        labelEls.forEach((l) => { l.classList.remove("hit"); const em = l.querySelector("em"); if (em) em.textContent = ""; labels.appendChild(l); });
        canvas.addEventListener("click", onClick);
        $("worldAction").hidden = false; $("worldAction").textContent = "Tocar o sino"; $("worldAction").onclick = strike;
      },
      stop() { canvas.removeEventListener("click", onClick); $("worldAction").hidden = true; },
      resize(w, h) { camera.aspect = w / h; camera.fov = w / h < 0.9 ? 58 : 40; camera.updateProjectionMatrix(); },
      update(dt) {
        time += dt;
        // golpe: recua, solta, bate, volta balançando
        const k = time - strikeT;
        let ang = 0;
        if (k < 0.55) ang = -0.55 * ease(k / 0.55);
        else if (k < 0.75) { ang = lerp(-0.55, 0.1, Math.pow((k - 0.55) / 0.2, 2)); if (k + dt >= 0.75 && !striker.userData.hit) { striker.userData.hit = true; onHit(); } }
        else if (k < 6) ang = 0.1 * Math.cos((k - 0.75) * 5) * Math.exp(-(k - 0.75) * 1.4) - 0.0;
        if (k < 0.55) striker.userData.hit = false;
        striker.rotation.z = ang;
        const sw = bellGroup.userData.swing || 0;
        bellGroup.rotation.z = sw * Math.sin(time * 6) * Math.exp(-(time - strikeT - 0.75) * 0.8) * (k > 0.75 ? 1 : 0);
        env.uPLR.value[2] = Math.max(0.001, env.uPLR.value[2] - dt * 1.4);
        // ondas
        ringMat.uniforms.uTime.value = time; ringMat.uniforms.uWaves.value.set(...waves);
        WALLS.forEach((w, i) => {
          let inc = 0;
          for (const t0 of waves) { const age = time - t0; if (age < 0 || age > 6.5) continue; const r = age * 4.6; inc = Math.max(inc, Math.exp(-Math.pow((w.x - r) / 0.5, 2)) * (1 - age / 6.5)); }
          const before = WALLS.slice(0, i).reduce((m, ww) => m * Math.pow(10, -ww.R / 20), 1);
          wallMats[i].uniforms.uHit.value = inc * Math.sqrt(before);
          if (inc > 0.5 && !labelEls[i + 1].classList.contains("hit")) {
            labelEls[i + 1].classList.add("hit");
            const [Lin, Lout] = levels[i];
            labelEls[i + 1].querySelector("em").textContent = `chega ${Math.round(Lin)} dB · passa ${Lout > 0 ? Math.round(Lout) + " dB" : "0 dB, silêncio"}`;
          }
        });
        // câmera
        const a = Math.sin(time * 0.08) * 0.08 + pointer.sx * 0.1;
        const narrow = W / H < 0.9;
        const dist = narrow ? 21 : 16.5;
        const target = new T.Vector3(narrow ? 6.5 : 5.4, 1.9, 0);
        camera.position.set(target.x - Math.sin(0.6 + a) * dist, 4.4 - pointer.sy * 0.6, Math.cos(0.6 + a) * dist);
        camera.lookAt(target);
        scene.userData.sky.position.copy(camera.position);
        // rótulos acompanham a cena
        const pts = [new T.Vector3(BELL.x - 1.2, 4.9, BELL.z + 2.2)].concat(WALLS.map((w, i) => new T.Vector3(w.x, 3.8 + i * 0.95, 3.4 - i * 0.6)));
        pts.forEach((p, i) => {
          const v = p.clone().project(camera); const l = labelEls[i];
          l.style.transform = `translate(-50%, -100%) translate(${(v.x * 0.5 + 0.5) * W}px, ${(-v.y * 0.5 + 0.5) * H}px)`;
          l.style.opacity = v.z < 1 ? "1" : "0";
        });
      },
      render(r) { r.setRenderTarget(null); r.render(scene, camera); },
    };
    return api;
  })();

  /* =================================================================== */
  /* NÓS                                                                  */
  /* =================================================================== */
  const nos = (() => {
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(42, 1, 0.1, 200);
    const env = envUniforms({ sun: [0.6, 0.55, 0.35], sunCol: "#3D4C7A", amb: "#3A2C30", fog: "#0A070C", fogDen: 0.02, glowCol: "#E0A458" });
    const LINES = ["A casa conhece você.", "Até o que você esconde.", "E sabe onde procurar.", "Volta… por favor.", "Você não precisa segurar tudo sozinho."];
    const KNOTS = [[0, 2.35, 2.25], [-2.3, 3.3, -1.4], [2.1, 4.4, -4.4], [-1.3, 5.5, -7.2], [0, 5.35, -9.75]].map((p) => new T.Vector3(...p));
    let time = 0, step = 0, camFrom = null, camTo = null, camK = 1, knotMeshes = [], hitMeshes = [], liamHead, loomMat, threadMat, done = false;
    const rt = new T.WebGLRenderTarget(320, 180, { minFilter: T.NearestFilter, magFilter: T.NearestFilter });
    const post = new T.Scene(), postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postMat = new T.ShaderMaterial({
      uniforms: { tDiffuse: { value: rt.texture }, uRes: { value: new T.Vector2(320, 180) }, uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uTime; varying vec2 vUv;
        float b2(vec2 p){ return p.x*2.0+p.y*3.0-p.x*p.y*4.0; }
        float bayer4(vec2 p){ p=mod(p,4.0); return b2(mod(p,2.0))*4.0+b2(floor(p/2.0)); }
        void main(){
          vec2 px=floor(vUv*uRes);
          vec3 c=texture2D(tDiffuse,(px+0.5)/uRes).rgb;
          float b=(bayer4(px)+0.5)/16.0-0.5;
          c=floor(c*16.0+b*0.55+0.5)/16.0;
          vec2 q=vUv-0.5; c*=1.0-dot(q,q)*1.1;
          c+=(fract(sin(dot(px+floor(uTime*12.0),vec2(12.9898,78.233)))*43758.5453)-0.5)*0.012;
          gl_FragColor=vec4(c,1.0);
        }`,
    });
    post.add(new T.Mesh(new T.PlaneGeometry(2, 2), postMat));
    const audioEl = $("nosAudio");

    function build() {
      const mat = toon(env);
      const line1 = outline(0.02, "#000000", env);
      const B = Builder(); const r = mulberry(12);
      // piso de tábuas e tapete
      B.add(new T.PlaneGeometry(14, 17, 28, 34), M(0, 0, -2.5, -Math.PI / 2, 0, 0), (x) => (((x + 7) * 2.2 | 0) & 1 ? "#2E1B14" : "#24150F"));
      B.add(new T.PlaneGeometry(4.2, 3.2, 42, 32), M(0, 0.012, 2.3, -Math.PI / 2, 0, 0), (x, y) => {
        const bx = Math.abs(x) > 1.85 || Math.abs(y) > 1.35;
        if (bx) return "#C49A4A";
        const d = (Math.abs(x * 2.4) + Math.abs(y * 2.4)) % 1;
        return d < 0.25 ? "#C49A4A" : d < 0.6 ? "#7E3424" : "#5A2420";
      });
      // paredes, portas, janela, quadros
      B.add(new T.PlaneGeometry(14, 12, 28, 1), M(0, 6, -11), (x) => (((x + 7) * 1.1 | 0) & 1 ? "#1C130F" : "#17100C"));
      for (const sx of [-1, 1]) {
        B.add(new T.PlaneGeometry(17, 12, 1, 1), M(sx * 7, 6, -2.5, 0, -sx * Math.PI / 2, 0), "#150E0B");
        B.add(new T.BoxGeometry(1.5, 2.6, 0.12), M(sx * 5.4, 1.3, -10.9), "#2A1A14");
        B.add(new T.BoxGeometry(1.8, 2.85, 0.08), M(sx * 5.4, 1.42, -10.95), "#3A2419");
        B.add(new T.SphereGeometry(0.06, 8, 6), M(sx * 5.4 + 0.5, 1.25, -10.8), "#C9A24A", 0.6);
      }
      B.add(new T.PlaneGeometry(2.2, 3.0), M(-6.96, 8.2, -5, 0, Math.PI / 2, 0), "#30507E", 1);
      B.add(new T.BoxGeometry(0.1, 3.2, 0.12), M(-6.9, 8.2, -5), "#1A110D");
      B.add(new T.BoxGeometry(0.1, 0.12, 2.4), M(-6.9, 8.2, -5), "#1A110D");
      [[-5.6, 4.2, -10.9, 0, 1.8, 1.2], [4.2, 3.8, -10.9, 0.18, 1.0, 0.8], [6.9, 4.4, 1.5, 0, 1.2, 1.4]].forEach(([x, y, z, rz, w, h], i) => {
        const ry = i === 2 ? -Math.PI / 2 : 0;
        B.add(new T.BoxGeometry(w + 0.16, h + 0.16, 0.06), M(x, y, z + (i === 2 ? 0 : 0.03), 0, ry, rz), "#6E5426");
        B.add(new T.PlaneGeometry(w, h), M(x - (i === 2 ? 0.04 : 0), y, z + (i === 2 ? 0 : 0.07), 0, ry, rz), i ? "#2B3A44" : "#3A4A52");
      });
      // piano e escada
      B.add(new T.BoxGeometry(2.2, 1.25, 0.8), M(-5.3, 0.62, -2.6), "#1E1412");
      B.add(new T.BoxGeometry(2.0, 0.06, 0.32), M(-5.3, 0.92, -2.12), (x) => (((x + 1) * 12 | 0) % 3 === 2 ? "#161010" : "#E6DCC6"));
      B.add(new T.BoxGeometry(0.7, 0.4, 0.04), M(-5.3, 1.45, -2.32, -0.2, 0, 0), "#D8CDB4");
      for (let k = 0; k < 11; k++) B.add(new T.BoxGeometry(1.6, 0.36, 0.7), M(5.9, 0.18 + k * 0.36, 0.6 - k * 0.62), k % 2 ? "#2A1A14" : "#24160F");
      for (let k = 0; k < 11; k++) B.add(new T.CylinderGeometry(0.03, 0.03, 0.9, 5), M(5.15, 0.55 + k * 0.36 + 0.45, 0.6 - k * 0.62), "#3A2419");
      B.add(new T.CylinderGeometry(0.035, 0.035, 7.6, 5), M(5.15, 2.88, -2.5, -Math.atan2(6.2, 3.96), 0, 0), "#4A2E1F");
      // luminária
      B.add(new T.CylinderGeometry(0.03, 0.03, 1.7, 6), M(-3.2, 0.85, 2.4), "#3A2A1E");
      B.add(new T.CylinderGeometry(0.22, 0.26, 0.05, 12), M(-3.2, 0.02, 2.4), "#3A2A1E");
      B.add(new T.CylinderGeometry(0.22, 0.42, 0.42, 16, 1, true), M(-3.2, 1.86, 2.4), "#F4C778", 1);
      // o Tear
      const LOOM = "#39261E";
      for (const sx of [-1, 1]) B.add(new T.BoxGeometry(0.4, 9.4, 0.4), M(sx * 4.1, 4.7, -10.2), LOOM);
      B.add(new T.BoxGeometry(9.0, 0.5, 0.5), M(0, 9.2, -10.2), LOOM);
      for (const y of [2.2, 4.6, 6.2]) B.add(new T.BoxGeometry(8.6, 0.3, 0.36), M(0, y, -10.1), LOOM);
      for (const sx of [-1, 1]) for (const y of [8.6, 9.6]) B.add(new T.CylinderGeometry(0.22, 0.22, 0.36, 12), M(sx * 3.4, y, -9.8, Math.PI / 2, 0, 0), "#6B4A2E");
      scene.add(new T.Mesh(B.build(), mat));

      // faixa tecida do Tear (acende no final)
      loomMat = toon(env);
      const LB = Builder();
      LB.add(new T.PlaneGeometry(7.6, 1.3, 76, 13), M(0, 5.4, -9.92), (x, y) => {
        const z = Math.abs(((x * 1.6 + Math.abs(y) * 2.2) % 1) - 0.5);
        return y > 0.5 || y < -0.5 ? "#4A2A1E" : z < 0.12 ? "#C9A24A" : z < 0.3 ? "#8E3B2A" : "#3A1E18";
      }, 1);
      scene.add(new T.Mesh(LB.build(), loomMat));
      loomMat.uniforms.uGlow.value = 0;
      // urdidura: fios verticais do Tear
      const warp = [];
      for (let k = 0; k < 64; k++) { const x = -3.8 + k * (7.6 / 63); warp.push(x, 2.4, -10.0, x, 9.0, -10.0); }
      const wg = new T.BufferGeometry(); wg.setAttribute("position", new T.Float32BufferAttribute(warp, 3));
      scene.add(new T.LineSegments(wg, new T.LineBasicMaterial({ color: 0x7b6552 })));

      // fios atravessando a casa
      const TB = Builder();
      for (let k = 0; k < 14; k++) {
        const a = new T.Vector3((r() - 0.5) * 8, 8.4 + r() * 1.2, -10);
        const b = new T.Vector3(r() > 0.5 ? 7 : -7, 3 + r() * 7, -9 + r() * 12);
        const mid = a.clone().lerp(b, 0.5); mid.y -= 1.2 + r() * 1.5;
        TB.add(new T.TubeGeometry(new T.QuadraticBezierCurve3(a, mid, b), 24, 0.018, 4), M(), k % 4 === 0 ? "#6A3A36" : "#3E4C5C");
      }
      scene.add(new T.Mesh(TB.build(), mat));

      // fio dourado com os cinco nós
      threadMat = toon(env);
      const pts = [new T.Vector3(0, 12, 2.25)].concat(KNOTS);
      const GB = Builder();
      GB.add(new T.TubeGeometry(new T.CatmullRomCurve3(pts, false, "centripetal"), 260, 0.03, 6), M(), "#E0A458", 1);
      scene.add(new T.Mesh(GB.build(), threadMat));
      KNOTS.forEach((p, i) => {
        const km = toon(env); km.uniforms.uGlow.value = 0.35;
        const mesh = new T.Mesh(Builder().add(new T.TorusKnotGeometry(0.13, 0.04, 64, 8, 2, 3), M(), "#E0A458", 1).build(), km);
        mesh.position.copy(p); scene.add(mesh); knotMeshes.push(mesh);
        const hit = new T.Mesh(new T.SphereGeometry(0.55, 8, 6), new T.MeshBasicMaterial()); hit.visible = false; hit.position.copy(p); hit.userData.i = i; scene.add(hit); hitMeshes.push(hit);
      });

      // Liam, de costas, no tapete
      const liam = new T.Group(); liam.position.set(0, 0, 2.7); scene.add(liam);
      const CB = Builder();
      for (const sx of [-1, 1]) {
        CB.add(new T.CapsuleGeometry(0.06, 0.42, 4, 8), M(sx * 0.08, 0.3, 0), "#2B2B36");
        CB.add(new T.CapsuleGeometry(0.065, 0.08, 4, 8), M(sx * 0.08, 0.06, -0.04, -Math.PI / 2, 0, 0), "#1A1414");
        CB.add(new T.CapsuleGeometry(0.05, 0.36, 4, 8), M(sx * 0.2, 0.76, 0, 0, 0, sx * 0.12), "#2C3A5E");
        CB.add(new T.SphereGeometry(0.045, 8, 6), M(sx * 0.225, 0.52, 0), "#E8C9B0");
      }
      CB.add(new T.CapsuleGeometry(0.16, 0.34, 6, 12), M(0, 0.78, 0), "#2C3A5E");
      CB.add(new T.CylinderGeometry(0.05, 0.05, 0.08, 8), M(0, 1.08, 0), "#E8C9B0");
      const liamBody = new T.Mesh(CB.build(), mat); liam.add(liamBody); liam.add(new T.Mesh(liamBody.geometry, line1));
      liamHead = new T.Group(); liamHead.position.set(0, 1.12, 0); liam.add(liamHead);
      const HB = Builder();
      HB.add(new T.SphereGeometry(0.15, 16, 12), M(0, 0.13, 0), "#E8C9B0");
      HB.add(new T.SphereGeometry(0.162, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), M(0, 0.15, 0.012, 0, 0, 0, 1.05, 1.05, 1.08), "#1C1714");
      for (let k = 0; k < 9; k++) { const a = Math.PI * (k / 8); HB.add(new T.ConeGeometry(0.04, 0.12, 5), M(Math.cos(a) * 0.15, 0.05, Math.sin(a) * 0.15, Math.PI - Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5), "#1C1714"); }
      const hm = new T.Mesh(HB.build(), mat); liamHead.add(hm); liamHead.add(new T.Mesh(hm.geometry, line1));

      // poeira na luz
      const dust = new T.BufferGeometry(); const dp = [];
      for (let k = 0; k < 260; k++) dp.push((r() - 0.5) * 10, r() * 8, 3 - r() * 12);
      dust.setAttribute("position", new T.Float32BufferAttribute(dp, 3));
      const dm = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uTime: { value: 0 } },
        vertexShader: `uniform float uTime; void main(){ vec3 p=position; p.y=mod(p.y+uTime*0.08,8.0); p.x+=sin(uTime*0.3+p.y)*0.2; vec4 mv=modelViewMatrix*vec4(p,1.0); gl_PointSize=14.0/-mv.z; gl_Position=projectionMatrix*mv; }`,
        fragmentShader: `void main(){ float d=length(gl_PointCoord-0.5); gl_FragColor=vec4(vec3(1.0,0.8,0.5)*smoothstep(0.5,0.1,d)*0.35,1.0); }` });
      const dustPts = new T.Points(dust, dm); dustPts.frustumCulled = false; scene.add(dustPts); scene.userData.dust = dm;

      env.uPL.value[0].set(-3.2, 1.9, 2.4); env.uPLC.value[0].set("#FFB46A"); env.uPLR.value[0] = 5.5;
      env.uPL.value[1].copy(KNOTS[0]); env.uPLC.value[1].set("#E0A458"); env.uPLR.value[1] = 1.6;
      env.uPL.value[2].set(0, 5.4, -9.6); env.uPLC.value[2].set("#E0A458"); env.uPLR.value[2] = 0.001;
    }

    const VIEW0 = { pos: new T.Vector3(0.5, 3.2, 10.6), tgt: new T.Vector3(0, 2.3, -10) };
    const viewFor = (i) => {
      if (i >= KNOTS.length) return { pos: new T.Vector3(0, 5.0, 0.6), tgt: new T.Vector3(0, 5.2, -10) };
      const k = KNOTS[i], nxt = KNOTS[Math.min(i + 1, KNOTS.length - 1)];
      return { pos: k.clone().add(new T.Vector3(0.9, 0.35, 2.9)), tgt: nxt.clone().lerp(k, 0.3) };
    };
    function goTo(v) { camFrom = { pos: camera.position.clone(), tgt: camera.userData.tgt.clone() }; camTo = v; camK = 0; }
    function advance() {
      if (done || camK < 1) return;
      const i = step;
      line.textContent = LINES[i]; line.classList.remove("show"); void line.offsetWidth; line.classList.add("show");
      knotMeshes[i].material.uniforms.uGlow.value = 1.6;
      step++;
      $("worldCount").textContent = `Nó ${Math.min(step + 1, 5)} de 5`;
      if (step >= KNOTS.length) {
        done = true; $("worldCount").textContent = "O Tear";
        hint.textContent = "";
        goTo(viewFor(step));
        setTimeout(() => { if (current === api) { dossierBtn.hidden = false; api.dossierReady = true; $("worldAction").hidden = true; } }, 3200);
      } else {
        env.uPL.value[1].copy(KNOTS[step]);
        goTo(viewFor(step - 1));
        hint.textContent = "Siga para o próximo nó.";
      }
    }
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    function onClick(e) {
      if (e.target !== canvas) return;
      const rc = canvas.getBoundingClientRect();
      ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(hitMeshes)[0];
      if (hit && hit.object.userData.i === step) advance();
    }

    const api = {
      template: "dossierNos", dossierLabel: "Abrir o dossiê do Nós", entered: false,
      titleHTML: `<span class="w-kicker">Porta preta</span><span class="w-name nos">NÓS</span>`,
      hintText: "Toque no nó que brilha.",
      build,
      start() {
        time = 0; step = 0; done = false; camK = 1; api.dossierReady = false;
        camera.position.copy(VIEW0.pos); camera.userData.tgt = VIEW0.tgt.clone();
        knotMeshes.forEach((m) => (m.material.uniforms.uGlow.value = 0.35));
        loomMat.uniforms.uGlow.value = 0; env.uPL.value[1].copy(KNOTS[0]); env.uPLR.value[2] = 0.001;
        canvas.addEventListener("click", onClick);
        $("worldCount").hidden = false; $("worldCount").textContent = "Nó 1 de 5";
        $("worldAction").hidden = false; $("worldAction").textContent = "Seguir o fio"; $("worldAction").onclick = advance;
        if (audioEl) { audioEl.currentTime = 0; audioEl.volume = 0.0; const p = audioEl.play(); if (p && p.catch) p.catch(() => {}); api.fade = 0; }
      },
      stop() {
        canvas.removeEventListener("click", onClick); $("worldCount").hidden = true; $("worldAction").hidden = true;
        if (audioEl) audioEl.pause();
      },
      resize(w, h) {
        camera.aspect = w / h; camera.fov = w / h < 0.9 ? 62 : 46; camera.updateProjectionMatrix();
        const ph = small ? 200 : 260;
        rt.setSize(Math.round(ph * w / h), ph); postMat.uniforms.uRes.value.set(Math.round(ph * w / h), ph);
      },
      update(dt) {
        time += dt;
        if (audioEl && !audioEl.paused) audioEl.volume = Math.max(0, Math.min(0.55, audioEl.volume + dt * 0.18));
        // câmera seguindo o fio
        if (camK < 1) {
          camK = Math.min(1, camK + dt / 2.4);
          const e = ease(camK);
          camera.position.copy(camFrom.pos).lerp(camTo.pos, e);
          camera.userData.tgt.copy(camFrom.tgt).lerp(camTo.tgt, e);
        }
        const tg = camera.userData.tgt.clone().add(new T.Vector3(pointer.sx * 0.5, -pointer.sy * 0.3, 0));
        camera.lookAt(tg);
        // nós: o próximo pulsa
        knotMeshes.forEach((m, i) => {
          m.rotation.y += dt * 0.6; m.rotation.x = Math.sin(time + i) * 0.3;
          if (i === step && !done) m.material.uniforms.uGlow.value = 0.7 + Math.sin(time * 4) * 0.45;
        });
        env.uPLR.value[1] = 1.4 + Math.sin(time * 4) * 0.3;
        if (done) { loomMat.uniforms.uGlow.value = Math.min(1.4, loomMat.uniforms.uGlow.value + dt * 0.5); env.uPLR.value[2] = Math.min(5, env.uPLR.value[2] + dt * 2.5); }
        liamHead.rotation.y = Math.sin(time * 0.4) * 0.12 + (line.classList.contains("show") ? 0.15 : 0);
        env.uPLR.value[0] = 5.5 + Math.sin(time * 9) * 0.06 + (Math.random() < 0.008 ? -0.8 : 0);
        scene.userData.dust.uniforms.uTime.value = time;
        postMat.uniforms.uTime.value = time;
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
    function grimoireHTML(sub) {
      const cat = sub.cat === "curso-tecnico" ? "Curso Técnico" : "Ensino Médio";
      const tris = [...new Set(sub.acts.map((a) => a.tri))].sort();
      const filters = tris.length > 1 ? `<div class="g-filter" role="group" aria-label="Filtrar por trimestre"><button type="button" aria-pressed="true" data-tri="all">Todos</button>${tris.map((t) => `<button type="button" aria-pressed="false" data-tri="${t}">${t}º trimestre</button>`).join("")}</div>` : "";
      const spells = sub.acts.map((a) => {
        const img = a.img ? `<img src="${esc(a.img.startsWith("http") ? a.img : BASE + a.img)}" alt="" loading="lazy" onerror="this.remove()">` : "";
        const img2 = a.img2 && a.img2 !== a.img ? `<img src="${esc(BASE + a.img2)}" alt="" loading="lazy" onerror="this.remove()">` : "";
        const k = a.k ? `<h4>Competências</h4><ul class="g-skills">${a.k.map(([c, d]) => `<li><b>${esc(c)}</b><span>${esc(d)}</span></li>`).join("")}</ul>` : "";
        const l = a.l ? `<ul class="d-links">${a.l.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noreferrer">${esc(t)}</a></li>`).join("")}</ul>` : "";
        return `<details class="spell" data-tri="${a.tri}"><summary><span class="g-tri">${a.tri}º</span><span class="g-t"><b>${esc(a.t)}</b><small>${esc(a.s)}</small></span></summary><div class="g-body">${img}${img2}${a.r ? `<p>${esc(a.r)}</p>` : ""}${k}${l}</div></details>`;
      }).join("");
      return `<span class="w-kicker">Grimório · ${cat}</span><h2 class="d-title"><span class="g-k">${(META[sub.code] || ["書"])[0]}</span>${esc(sub.name)}</h2><p class="d-sub">${esc(sub.desc)}</p>
        <p class="g-count">${sub.acts.length} ${sub.acts.length === 1 ? "feitiço aprendido" : "feitiços aprendidos"}</p>${filters}<div class="spells">${spells}</div>`;
    }
    function select(i) {
      if (selected === i) return;
      selected = i;
      const b = books[i];
      $("dossierBody").innerHTML = grimoireHTML(b.sub);
      const body = $("dossierBody");
      body.querySelectorAll(".g-filter button").forEach((btn) => btn.addEventListener("click", () => {
        body.querySelectorAll(".g-filter button").forEach((x) => x.setAttribute("aria-pressed", String(x === btn)));
        body.querySelectorAll(".spell").forEach((sp) => { sp.hidden = btn.dataset.tri !== "all" && sp.dataset.tri !== btn.dataset.tri; });
      }));
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
      $("dossierBody").innerHTML = `<span class="w-kicker">Lembrança · ${esc(mm.tag)}</span><h2 class="d-title">${esc(mm.t)}</h2><img class="d-cover" src="${esc(BASE + mm.src)}" alt="${esc(mm.t)}"><p>${esc(mm.d)}</p><p class="d-note">${i + 1} de ${MEMS.length}</p>`;
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
    let time = 0, hovered = null, selected = null, hits = [], flames = [], charms = [], tip, camFrom = null, camK = 1, sayTimer = null;

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
        html: () => overviewHTML(),
      },
    };
    function overviewHTML() {
      return `<span class="w-kicker">Alto do castelo</span><h2 class="d-title">O quarto</h2>
        <p class="d-sub">O que eu gosto, guardado onde dá para ver.</p>
        <div class="q-grid">${["ghibli", "anime", "japao", "jogos"].map((id) => `<button type="button" class="q-card" data-spot="${id}"><b>${SPOTS[id].k}</b><span>${SPOTS[id].sub}</span><small>${SPOTS[id].name}</small></button>`).join("")}</div>
        <p class="d-note">O Calcifer, na lareira, conhece cada canto. Toque nele quando quiser voltar para cá.</p>`;
    }

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
      const cal = new T.Group(); cal.position.set(HX, 0.32, HZ - 0.2); scene.add(cal);
      const logs = Builder();
      logs.add(new T.CylinderGeometry(0.09, 0.09, 0.8, 8), M(0, 0.06, 0, 0, 0.5, Math.PI / 2), "#4A3020");
      logs.add(new T.CylinderGeometry(0.09, 0.09, 0.8, 8), M(0, 0.06, 0.05, 0, -0.5, Math.PI / 2), "#5A3B26");
      cal.add(new T.Mesh(logs.build(), mat));
      const flameMat = toon(env);
      const fl = (geo, m, c) => { const b = Builder(); b.add(geo, m, c, 1); const mesh = new T.Mesh(b.build(), flameMat); cal.add(mesh); return mesh; };
      const body = fl(new T.SphereGeometry(0.3, 18, 14), M(0, 0.36, 0, 0, 0, 0, 1, 1.15, 0.9), "#FF7A1E");
      const core = fl(new T.SphereGeometry(0.2, 14, 10), M(0, 0.32, 0.08, 0, 0, 0, 1, 1.1, 0.9), "#FFC24A");
      const tipF = fl(new T.ConeGeometry(0.18, 0.5, 12), M(0, 0.78, -0.02), "#FF8A2A");
      const tongues = [[-0.24, 0.55, -0.3], [0.25, 0.58, 0.32], [-0.1, 0.7, -0.15], [0.12, 0.66, 0.2]].map(([x, y, rz]) => fl(new T.ConeGeometry(0.09, 0.32, 8), M(x, y, -0.04, 0, 0, rz), "#FF9A3A"));
      flames.push(body, core, tipF, ...tongues);
      const face = Builder();
      for (const s of [-1, 1]) { face.add(new T.SphereGeometry(0.075, 12, 10), M(s * 0.1, 0.44, 0.25), "#FFFFFF", 0.7); face.add(new T.SphereGeometry(0.036, 10, 8), M(s * 0.1, 0.44, 0.315), "#1C1412", 0); }
      face.add(new T.BoxGeometry(0.14, 0.03, 0.02), M(0, 0.3, 0.27), "#7A2A10", 0);
      const faceMesh = new T.Mesh(face.build(), mat); cal.add(faceMesh);
      cal.userData = { body, faceMesh };

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

    function say(text) {
      line.textContent = text; line.classList.remove("show"); void line.offsetWidth; line.classList.add("show");
    }
    const V = (a) => new T.Vector3(...a);
    const IDLE = { pos: [0, 2.3, 3.9], tgt: [0, 1.8, -2.0] };
    function bindDossier() {
      const body = $("dossierBody");
      body.querySelectorAll("[data-spot]").forEach((b) => b.addEventListener("click", () => select(b.dataset.spot)));
      body.querySelectorAll("[data-go-world]").forEach((b) => b.addEventListener("click", () => { const w = b.dataset.goWorld; close(); open(w); }));
    }
    function select(id) {
      selected = id;
      const s = SPOTS[id];
      camFrom = { pos: camera.position.clone(), tgt: camera.userData.tgt.clone() }; camK = 0;
      say(s.say);
      $("dossierBody").innerHTML = s.html(); bindDossier();
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
      template: "", dossierLabel: "Ver todos os gostos", select: (id) => select(id),
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
        flames.forEach((f, i) => { const k = 1 + Math.sin(time * (5 + i * 1.3) + i) * 0.06 + Math.sin(time * 11.7 + i * 2.1) * 0.03; f.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k)); });
        const talk = line.classList.contains("show") ? Math.abs(Math.sin(time * 9)) * 0.05 : 0;
        const fm = flames[0].parent.userData.faceMesh; if (fm) fm.position.y = Math.sin(time * 2.2) * 0.015 + talk;
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

  const worlds = { templo, nos, torre, trem, quarto };
  window.mundos = { open, close, worlds };
})();
