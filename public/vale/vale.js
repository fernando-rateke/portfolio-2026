/* O Vale: cena 3D da abertura do guia de identidade.
   Three.js r149 (UMD). Todos os materiais são shaders próprios com
   sombreamento em faixas (cel shading), névoa de distância e modo noite. */
(() => {
  "use strict";
  const T = window.THREE;
  const canvas = document.getElementById("valley");
  if (!T || !canvas) return;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;

  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch (e) {
    canvas.classList.add("no-webgl");
    document.documentElement.classList.add("no-webgl");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.setClearColor(0x9fcbea, 1);

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(38, 1, 0.1, 4000);
  const reflectCam = new T.PerspectiveCamera(38, 1, 0.1, 4000);

  /* ------------------------------------------------------------------ */
  /* Ruído (JS) para o relevo                                            */
  /* ------------------------------------------------------------------ */
  function mulberry(a) {
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const perm = new Uint8Array(512);
  {
    const r = mulberry(1337); const p = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  }
  const G2 = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  function noise2(x, y) {
    const F = 0.366025403, Gk = 0.211324865;
    const s = (x + y) * F; const i = Math.floor(x + s), j = Math.floor(y + s);
    const t = (i + j) * Gk; const x0 = x - (i - t), y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + Gk, y1 = y0 - j1 + Gk, x2 = x0 - 1 + 2 * Gk, y2 = y0 - 1 + 2 * Gk;
    const ii = i & 255, jj = j & 255;
    let n = 0;
    const c = (gx, gy, xx, yy) => { let tt = 0.5 - xx * xx - yy * yy; if (tt < 0) return 0; tt *= tt; const g = G2[perm[gx + perm[gy]] & 7]; return tt * tt * (g[0] * xx + g[1] * yy); };
    n += c(ii, jj, x0, y0); n += c(ii + i1, jj + j1, x1, y1); n += c(ii + 1, jj + 1, x2, y2);
    return 70 * n;
  }
  const fbm = (x, y, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * noise2(x * f, y * f); f *= 2.03; a *= 0.5; } return s; };
  const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

  // Lagos: elipses com borda irregular. As ilhotas surgem do próprio ruído.
  const LAKES = [
    { x: -14, z: -36, rx: 74, rz: 19 },
    { x: -66, z: -20, rx: 28, rz: 7.5 },
    { x: 52, z: -20, rx: 36, rz: 8.5 },
    { x: 34, z: -92, rx: 80, rz: 15 },
    { x: -72, z: -128, rx: 70, rz: 13 },
    { x: 110, z: -150, rx: 60, rz: 12 },
  ];
  function heightAt(x, z) {
    let h = 0.62 + 0.32 * fbm(x * 0.018, z * 0.018, 3);
    let lake = 0, isle = 0;
    for (const L of LAKES) {
      const dx = (x - L.x) / L.rx, dz = (z - L.z) / L.rz;
      const d = Math.sqrt(dx * dx + dz * dz) + 0.32 * fbm(x * 0.045 + L.x, z * 0.08 + L.z, 3);
      lake = Math.max(lake, smooth(0.86, 0.74, d));
    }
    if (lake > 0) isle = smooth(0.42, 0.52, fbm(x * 0.05 + 11, z * 0.11 + 4, 3));
    h -= lake * 1.35;
    h += lake * isle * 1.45;
    // ilhota da Torre dos Grimórios, no lago do fundo
    h += 1.6 * Math.exp(-((x - 62) * (x - 62) + (z + 100) * (z + 100)) / 30);
    // colina dos personagens, de onde se vê o vale
    h += 1.35 * Math.exp(-((x - 6) * (x - 6) + (z - 18) * (z - 18)) / 150);
    // leve subida nas bordas do vale
    h += Math.max(0, Math.abs(x) - 140) * 0.02 + Math.max(0, -z - 260) * 0.012;
    return h;
  }

  /* ------------------------------------------------------------------ */
  /* GLSL comum                                                          */
  /* ------------------------------------------------------------------ */
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
    }
    float fbm(vec2 p){float s=0.0,a=0.5;for(int i=0;i<4;i++){s+=a*snoise(p);p*=2.03;a*=0.5;}return s;}
  `;
  const COMMON = `
    uniform float uTime; uniform float uNight; uniform float uDusk; uniform float uReflect; uniform float uHaze;
    uniform vec3 uSun; uniform vec3 uFogDay; uniform vec3 uFogDusk; uniform vec3 uFogNight; uniform float uFogDensity;
    uniform vec3 uLanterns[2];
    vec3 fogColor(){ return mix(mix(uFogDay,uFogDusk,uDusk),uFogNight,uNight); }
    vec3 hazeColor(){ return mix(mix(vec3(0.93,0.95,0.97),vec3(0.98,0.80,0.74),uDusk),vec3(0.20,0.25,0.36),uNight); }
    // fim de tarde: tudo esquenta, sombras puxam para o lilás
    vec3 duskGrade(vec3 c){ float l=dot(c,vec3(0.3,0.55,0.15)); vec3 warm=c*vec3(1.10,0.80,0.74)+vec3(0.06,0.015,0.04); vec3 shade=mix(vec3(0.30,0.22,0.42),vec3(1.0),smoothstep(0.05,0.6,l)); return warm*mix(shade,vec3(1.0),0.55); }
    vec3 lanternGlow(vec3 w){
      vec3 g=vec3(0.0);
      for(int i=0;i<2;i++){ float d=length(w-uLanterns[i]); g+=vec3(1.0,0.62,0.25)*(0.55/(1.0+d*d*0.35)); }
      return g;
    }
    vec3 applyFog(vec3 col, vec3 w){
      float dk=uDusk*(1.0-uNight);
      col=mix(col,duskGrade(col),dk);
      col+=lanternGlow(w)*dk*0.35;
      float d=length(w-cameraPosition);
      float f=1.0-exp(-pow(d*uFogDensity,1.35));
      col=mix(col,fogColor(),clamp(f,0.0,0.94));
      return mix(col, hazeColor(), uHaze);
    }
    vec3 nightTint(vec3 c){ return c*vec3(0.20,0.27,0.40)+vec3(0.012,0.018,0.035); }
  `;
  const col = (h) => new T.Color(h);

  const U = {
    uTime: { value: 0 }, uNight: { value: 0 }, uDusk: { value: 0 }, uReflect: { value: 0 }, uHaze: { value: 0 }, uGustAmp: { value: 1 },
    uSun: { value: new T.Vector3(-0.35, 0.78, 0.52).normalize() },
    uFogDay: { value: col("#C4DDE8") }, uFogDusk: { value: col("#E2A3A0") }, uFogNight: { value: col("#1A2943") },
    uFogDensity: { value: 0.0021 },
    uLanterns: { value: [new T.Vector3(), new T.Vector3()] },
    uWind: { value: new T.Vector2(1, -0.35).normalize() },
  };
  const mat = (vs, fs, extra = {}, opts = {}) => new T.ShaderMaterial(Object.assign({
    uniforms: Object.assign({}, U, extra),
    vertexShader: vs, fragmentShader: fs,
  }, opts));

  const VS_WORLD = `
    varying vec3 vW; varying vec3 vN;
    void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }
  `;

  /* ------------------------------------------------------------------ */
  /* Céu                                                                 */
  /* ------------------------------------------------------------------ */
  const DAY_SUN = new T.Vector3(-0.35, 0.78, 0.52).normalize(), DUSK_SUN = new T.Vector3(0.36, 0.05, -0.93).normalize(), DUSK_SUN_LIGHT = new T.Vector3(0.45, 0.32, -0.83).normalize();
  const sky = new T.Mesh(new T.SphereGeometry(1800, 48, 24), mat(
    `varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    `${COMMON}${NOISE}
     uniform vec3 uZenD, uHorD, uZenN, uHorN, uMoon, uDuskSun; varying vec3 vDir;
     float hash(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
     void main(){
       vec3 d=normalize(vDir); float y=d.y;
       vec3 day=mix(uHorD,uZenD,smoothstep(-0.02,0.5,y));
       day+=vec3(0.16,0.14,0.09)*pow(max(dot(d,normalize(vec3(0.55,0.42,-0.72))),0.0),5.0);
       // pôr do sol: dourado no horizonte, coral, rosa, magenta, roxo e índigo no alto
       float yy=max(y,0.0);
       vec3 dusk=mix(vec3(1.0,0.74,0.42),vec3(0.98,0.55,0.45),smoothstep(0.0,0.07,yy));
       dusk=mix(dusk,vec3(0.86,0.43,0.60),smoothstep(0.05,0.17,yy));
       dusk=mix(dusk,vec3(0.50,0.36,0.66),smoothstep(0.15,0.36,yy));
       dusk=mix(dusk,vec3(0.17,0.18,0.42),smoothstep(0.32,0.85,yy));
       float sd=dot(d,uDuskSun);
       float side=clamp(dot(normalize(d.xz+1e-4),normalize(uDuskSun.xz)),-1.0,1.0);
       // lado do sol mais quente; do lado oposto, a sombra da Terra e o cinturão de Vênus
       dusk=mix(dusk,vec3(1.0,0.82,0.52),pow(max(sd,0.0),7.0)*0.85*(1.0-smoothstep(0.1,0.5,yy)));
       float anti=smoothstep(0.1,-0.8,side);
       dusk=mix(dusk,vec3(0.93,0.62,0.72),anti*smoothstep(0.02,0.07,yy)*(1.0-smoothstep(0.12,0.24,yy))*0.75);
       dusk=mix(dusk,vec3(0.34,0.40,0.62),anti*(1.0-smoothstep(0.0,0.045,yy))*0.8);
       dusk+=vec3(1.0,0.93,0.72)*(smoothstep(0.99865,0.9992,sd)*1.4+pow(max(sd,0.0),900.0)*0.6+pow(max(sd,0.0),60.0)*0.25);
       dusk+=vec3(1.0,0.9,0.95)*step(0.9985,hash(floor(d*300.0)))*smoothstep(0.45,0.8,yy)*0.6;
       vec3 night=mix(uHorN,uZenN,smoothstep(-0.02,0.55,y));
       // muitas estrelas, umas maiores, e uma Via Láctea discreta
       vec3 cell=floor(d*380.0); float h=hash(cell);
       float star=step(0.9952,h)*smoothstep(0.02,0.18,y);
       night+=vec3(0.85,0.9,1.0)*star*(0.45+0.55*sin(uTime*1.7+h*91.0))*(0.6+0.4*fract(h*37.0));
       vec3 cell2=floor(d*140.0); float h2=hash(cell2+3.1);
       night+=vec3(1.0,0.95,0.85)*step(0.9982,h2)*smoothstep(0.05,0.2,y)*(0.75+0.25*sin(uTime*2.3+h2*50.0));
       float band=exp(-pow(dot(d,normalize(vec3(0.35,0.55,0.75)))*4.2,2.0))*smoothstep(0.0,0.3,y);
       night+=vec3(0.30,0.32,0.48)*band*(0.35+0.65*smoothstep(-0.2,0.8,fbm(d.xz*6.0+d.y*3.0)))*0.35;
       float md=dot(d,uMoon);
       float disc=smoothstep(0.99935,0.9996,md);
       float bite=smoothstep(0.99935,0.9996,dot(d,normalize(uMoon+vec3(0.011,0.008,0.004))));
       night+=vec3(0.93,0.94,0.9)*disc*(1.0-bite*0.96)+vec3(0.22,0.28,0.42)*pow(max(md,0.0),420.0)*0.7;
       vec3 c=mix(mix(day,dusk,uDusk),night,uNight);
       c=mix(c, hazeColor(), uHaze);
       gl_FragColor=vec4(c,1.0);
     }`,
    { uZenD: { value: col("#2468AA") }, uHorD: { value: col("#BCDBEA") }, uZenN: { value: col("#040914") }, uHorN: { value: col("#1C2D4C") }, uMoon: { value: new T.Vector3(0.42, 0.36, -0.83).normalize() }, uDuskSun: { value: DUSK_SUN } },
    { side: T.BackSide, depthWrite: false }
  ));
  sky.renderOrder = -10;
  scene.add(sky);

  /* ------------------------------------------------------------------ */
  /* Terreno                                                             */
  /* ------------------------------------------------------------------ */
  {
    const NX = small ? 220 : 340, NZ = small ? 190 : 300;
    const pos = new Float32Array((NX + 1) * (NZ + 1) * 3);
    let k = 0;
    for (let j = 0; j <= NZ; j++) {
      const v = j / NZ; const z = 60 - Math.pow(v, 1.75) * 620;
      for (let i = 0; i <= NX; i++) {
        const u = i / NX * 2 - 1; const x = Math.sign(u) * Math.pow(Math.abs(u), 1.45) * 460;
        pos[k++] = x; pos[k++] = heightAt(x, z); pos[k++] = z;
      }
    }
    const idx = [];
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const m = mat(VS_WORLD, `${COMMON}${NOISE}
      uniform vec3 uGA, uGB, uGC, uBank, uPink, uYellow, uWhite; varying vec3 vW; varying vec3 vN;
      void main(){
        if(uReflect>0.5 && vW.y<-0.02) discard;
        vec3 n=normalize(vN);
        float p1=fbm(vW.xz*0.03); float p2=snoise(vW.xz*0.11+3.0);
        vec3 c=mix(uGA,uGB,smoothstep(-0.45,0.45,p1));
        c=mix(c,uGC,smoothstep(0.5,0.95,p2)*0.4);
        float ndl=dot(n,uSun);
        c*=mix(0.8,1.0,smoothstep(0.38,0.55,ndl));
        float d=length(vW-cameraPosition);
        // flores pintadas no campo distante (perto, são instâncias)
        float patchv=fbm(vW.xz*0.025+7.0);
        float sp=snoise(vW.xz*vec2(1.9,3.6));
        float spec=step(0.74,sp)*smoothstep(-0.05,0.35,patchv);
        vec3 fc=mix(uWhite,uYellow,smoothstep(0.05,0.2,patchv)); fc=mix(fc,uPink,smoothstep(0.25,0.4,patchv));
        c=mix(c,fc,spec*smoothstep(16.0,34.0,d)*0.85);
        // barranco escuro nas margens (como na referência)
        float steep=1.0-smoothstep(0.55,0.86,n.y);
        float nearW=1.0-smoothstep(0.25,1.1,vW.y);
        c=mix(c,uBank,clamp(steep*1.6,0.0,1.0)*nearW);
        c=mix(c,uBank*0.75,1.0-smoothstep(-0.06,0.1,vW.y));
        c=mix(c,nightTint(c),uNight);
        c+=lanternGlow(vW)*uNight;
        gl_FragColor=vec4(applyFog(c,vW),1.0);
      }`,
      { uGA: { value: col("#5F9B47") }, uGB: { value: col("#86BD5B") }, uGC: { value: col("#B9C766") }, uBank: { value: col("#1E3D49") },
        uPink: { value: col("#E58FAA") }, uYellow: { value: col("#F1D35A") }, uWhite: { value: col("#F6F4EA") } },
      { side: T.DoubleSide });
    scene.add(new T.Mesh(g, m));
  }

  /* ------------------------------------------------------------------ */
  /* Água com reflexo                                                    */
  /* ------------------------------------------------------------------ */
  const rt = new T.WebGLRenderTarget(16, 16, { depthBuffer: true });
  const water = new T.Mesh(new T.PlaneGeometry(1100, 760, 1, 1), mat(VS_WORLD, `${COMMON}${NOISE}
    uniform sampler2D tReflect; uniform vec2 uRes; uniform vec3 uDeepD, uDeepN; varying vec3 vW;
    void main(){
      vec3 V=normalize(cameraPosition-vW);
      float fres=pow(1.0-max(V.y,0.0),3.2);
      float d=length(vW-cameraPosition);
      vec2 uv=gl_FragCoord.xy/uRes;
      float r1=snoise(vW.xz*vec2(0.22,0.9)+vec2(uTime*0.22,0.0));
      float r2=snoise(vW.xz*vec2(0.55,1.9)-vec2(uTime*0.35,uTime*0.08));
      vec2 off=vec2(r1*0.6+r2*0.4, r2)*0.0045*(1.0-smoothstep(40.0,260.0,d));
      vec3 refl=texture2D(tReflect,vec2(1.0-uv.x,uv.y)+off).rgb;
      vec3 deep=mix(uDeepD,uDeepN,uNight);
      vec3 c=mix(deep,refl,clamp(0.3+0.68*fres,0.0,0.96));
      c+=vec3(0.07)*smoothstep(0.72,0.95,r2)*(1.0-uNight)*(1.0-smoothstep(30.0,120.0,d));
      gl_FragColor=vec4(applyFog(c,vW),1.0);
    }`,
    { tReflect: { value: rt.texture }, uRes: { value: new T.Vector2(1, 1) }, uDeepD: { value: col("#215F7D") }, uDeepN: { value: col("#0C1A2C") } }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0, -200);
  scene.add(water);

  /* ------------------------------------------------------------------ */
  /* Montanhas nevadas                                                   */
  /* ------------------------------------------------------------------ */
  const mountFS = `${COMMON}${NOISE}
    uniform vec3 uRock, uRockD, uSnow, uSnowS, uLow; uniform float uSnowLine; varying vec3 vW; varying vec3 vN;
    void main(){
      vec3 n=normalize(vN); float ndl=dot(n,uSun);
      float strata=snoise(vec2(vW.x*0.09+vW.z*0.03,vW.y*0.035))*0.5+0.5;
      float gully=smoothstep(0.55,0.95,abs(snoise(vec2(vW.x*0.05,vW.y*0.012+vW.z*0.02))));
      vec3 rock=mix(uRockD,uRock,smoothstep(0.12+strata*0.12,0.34,ndl));
      rock*=0.86+0.14*strata; rock=mix(rock,uRockD*0.8,gully*0.45);
      vec3 sn=mix(uSnowS,uSnow,smoothstep(0.18,0.36,ndl));
      float line=uSnowLine+snoise(vW.xz*0.035)*9.0+snoise(vW.xz*0.12)*3.0;
      float snow=smoothstep(line-3.0,line+3.0,vW.y)*smoothstep(0.3,0.55,n.y+snoise(vW.xz*0.08)*0.12);
      snow=max(snow, smoothstep(line+10.0,line+16.0,vW.y)*(0.8-gully*0.3));
      vec3 c=mix(rock,sn,snow);
      c+=vec3(1.0,0.95,0.85)*smoothstep(0.62,0.9,ndl)*0.08*(1.0-uNight);
      c=mix(uLow*mix(0.82,1.0,smoothstep(0.2,0.4,ndl)),c,smoothstep(3.0,18.0,vW.y));
      c=mix(c,duskGrade(c),uDusk*(1.0-uNight));
      c=mix(c,nightTint(c)*1.15,uNight);
      float d=length(vW-cameraPosition);
      c=mix(c,fogColor(),clamp(0.14+(d-200.0)/900.0,0.0,0.62));
      c=mix(c, hazeColor(), uHaze);
      gl_FragColor=vec4(c,1.0);
    }`;
  function mountainRange(cx, cz, w, dpt, peaks, snowLine, seed) {
    const g = new T.PlaneGeometry(w, dpt, small ? 120 : 220, small ? 50 : 90);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      let h = 0;
      for (const pk of peaks) {
        const dx = (x - pk[0]) / pk[2], dz = (z - pk[1]) / (pk[2] * 0.8);
        h += pk[3] * Math.exp(-(dx * dx + dz * dz) * 1.6);
      }
      const ridge = 1 - Math.abs(noise2(x * 0.022 + seed, z * 0.022 - seed));
      const detail = fbm(x * 0.06 + seed, z * 0.06, 3);
      h *= 0.9 + ridge * ridge * 0.16 + detail * 0.05;
      const edge = smooth(0, 0.18, Math.min(x / w + 0.5, 0.5 - x / w)) * smooth(0, 0.2, Math.min(z / dpt + 0.5, 0.5 - z / dpt));
      p.setY(i, h * edge - 6 * (1 - edge));
    }
    g.computeVertexNormals();
    const m = mat(VS_WORLD, mountFS, {
      uRock: { value: col("#56717C") }, uRockD: { value: col("#38505B") }, uSnow: { value: col("#F4F7F8") }, uSnowS: { value: col("#A9C0D3") },
      uLow: { value: col("#5E8A56") }, uSnowLine: { value: snowLine },
    });
    const mesh = new T.Mesh(g, m); mesh.position.set(cx, 0, cz); scene.add(mesh);
  }
  mountainRange(-230, -540, 440, 210, [[-20, 0, 82, 150], [85, -15, 62, 104], [-135, 25, 58, 84]], 96, 3);
  mountainRange(250, -580, 400, 200, [[-15, 0, 78, 128], [95, 15, 60, 96], [-115, -10, 52, 70]], 84, 9);
  mountainRange(0, -860, 1500, 220, [[-380, 0, 120, 96], [-140, 30, 100, 72], [120, -10, 110, 88], [380, 20, 120, 100]], 66, 17);

  /* ------------------------------------------------------------------ */
  /* Nuvens cumulus                                                      */
  /* ------------------------------------------------------------------ */
  let cloudMesh;
  {
    const CLOUDS = [
      { x: -20, y: 26, z: -760, s: 125, h: 120, n: small ? 70 : 120 },
      { x: 250, y: 22, z: -820, s: 70, h: 70, n: small ? 34 : 56 },
      { x: -300, y: 22, z: -800, s: 78, h: 74, n: small ? 34 : 60 },
      { x: 140, y: 120, z: -700, s: 34, h: 24, n: 22 },
      { x: -170, y: 140, z: -640, s: 30, h: 20, n: 20 },
      { x: 420, y: 70, z: -900, s: 50, h: 40, n: 26 },
    ];
    const base = new T.IcosahedronGeometry(1, small ? 2 : 3);
    const bp = base.attributes.position.array, bn = base.attributes.normal.array;
    const idxBase = base.index ? base.index.array : null;
    const positions = [], normals = [], bases = [], heights = [], amps = [], indices = [];
    let vOff = 0;
    const rnd = mulberry(77);
    for (const c of CLOUDS) {
      for (let i = 0; i < c.n; i++) {
        const hf = Math.pow(rnd(), 1.25);
        const ring = c.s * (1 - hf * 0.62);
        const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd());
        const px = c.x + Math.cos(a) * ring * rr * 1.15;
        const pz = c.z + Math.sin(a) * ring * rr * 0.55;
        const r = c.s * (0.2 + rnd() * 0.22) * (1 - hf * 0.35);
        const py = c.y + hf * c.h + r * 0.35;
        for (let v = 0; v < bp.length; v += 3) {
          positions.push(px + bp[v] * r, py + bp[v + 1] * r, pz + bp[v + 2] * r * 0.85);
          normals.push(bn[v], bn[v + 1], bn[v + 2]);
          bases.push(c.y); heights.push(c.h + c.s * 0.4); amps.push(r * 0.18);
        }
        if (idxBase) for (let q = 0; q < idxBase.length; q++) indices.push(idxBase[q] + vOff);
        else for (let q = 0; q < bp.length / 3; q++) indices.push(q + vOff);
        vOff += bp.length / 3;
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
    g.setAttribute("aBase", new T.Float32BufferAttribute(bases, 1));
    g.setAttribute("aH", new T.Float32BufferAttribute(heights, 1));
    g.setAttribute("aAmp", new T.Float32BufferAttribute(amps, 1));
    g.setIndex(indices);
    const m = mat(`${NOISE}
      uniform float uTime; attribute float aBase; attribute float aH; attribute float aAmp;
      varying vec3 vW; varying vec3 vN; varying float vBase; varying float vHt;
      void main(){
        vec3 p=position;
        float b=snoise(p.xy*0.045+vec2(uTime*0.012,0.0))*0.6+snoise(p.zy*0.07-vec2(0.0,uTime*0.01))*0.4;
        p+=normal*b*aAmp*1.3;
        vec4 w=modelMatrix*vec4(p,1.0); vW=w.xyz; vN=normal; vBase=aBase+modelMatrix[3].y; vHt=aH;
        gl_Position=projectionMatrix*viewMatrix*w;
      }`,
      `${COMMON}${NOISE}
      uniform vec3 uShD, uMidD, uLitD, uShK, uMidK, uLitK, uShN, uMidN, uLitN; varying vec3 vW; varying vec3 vN; varying float vBase; varying float vHt;
      void main(){
        if(vW.y < vBase + snoise(vW.xz*0.06)*2.2) discard;
        vec3 n=normalize(vN+0.13*vec3(snoise(vW.yz*0.028),snoise(vW.xz*0.028),snoise(vW.xy*0.028)));
        float hf=clamp((vW.y-vBase)/vHt,0.0,1.0);
        float v=(dot(n,uSun)*0.5+0.5)*0.7+hf*0.44;
        vec3 sh=mix(mix(uShD,uShK,uDusk),uShN,uNight), md=mix(mix(uMidD,uMidK,uDusk),uMidN,uNight), lt=mix(mix(uLitD,uLitK,uDusk),uLitN,uNight);
        vec3 c=mix(sh,md,smoothstep(0.46,0.6,v));
        c=mix(c,lt,smoothstep(0.66,0.8,v));
        vec3 V=normalize(cameraPosition-vW);
        c+=mix(vec3(0.06,0.06,0.05),vec3(0.22,0.12,0.04),uDusk)*(1.0-uNight)*smoothstep(0.55,0.95,1.0-abs(dot(normalize(vN),V)));
        c*=mix(0.84,1.0,smoothstep(0.0,0.16,hf));
        float d=length(vW-cameraPosition);
        c=mix(c,fogColor(),clamp((d-250.0)/1400.0,0.0,0.35));
        c=mix(c, hazeColor(), uHaze);
        gl_FragColor=vec4(c,1.0);
      }`,
      { uShD: { value: col("#93ABC2") }, uMidD: { value: col("#D7E2EB") }, uLitD: { value: col("#FFFDF6") },
        uShK: { value: col("#9A78B4") }, uMidK: { value: col("#F4A3A8") }, uLitK: { value: col("#FFDDA6") },
        uShN: { value: col("#1A2438") }, uMidN: { value: col("#2C3B58") }, uLitN: { value: col("#5C6F93") } });
    cloudMesh = new T.Mesh(g, m);
    cloudMesh.frustumCulled = false;
    scene.add(cloudMesh);

    // Névoa na base das nuvens
    const mc = document.createElement("canvas"); mc.width = mc.height = 128;
    const mg = mc.getContext("2d"); const gr = mg.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,0.85)"); gr.addColorStop(0.5, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    mg.fillStyle = gr; mg.fillRect(0, 0, 128, 128);
    const mistTex = new T.CanvasTexture(mc);
    const mistMat = new T.SpriteMaterial({ map: mistTex, color: 0xe8f1f6, transparent: true, opacity: 0.55, depthWrite: false, fog: false });
    for (const c of CLOUDS.slice(0, 3)) {
      for (let i = 0; i < 4; i++) {
        const s = new T.Sprite(mistMat);
        s.position.set(c.x + (i - 1.5) * c.s * 0.7, c.y + 4, c.z + 12);
        s.scale.set(c.s * 2.2, c.s * 0.55, 1);
        cloudMesh.add(s);
      }
    }
    cloudMesh.userData.mist = mistMat;
    // neblina baixa nos morros e no pé das montanhas
    const hillMist = new T.SpriteMaterial({ map: mistTex, color: 0x9fb2d0, transparent: true, opacity: 0, depthWrite: false, fog: false });
    const hm = new T.Group(); const rr = mulberry(71);
    for (let i = 0; i < 26; i++) {
      const sp = new T.Sprite(hillMist);
      const x = -260 + rr() * 520, z = -150 - rr() * 120;
      sp.position.set(x, 6 + rr() * 10, z); sp.scale.set(90 + rr() * 80, 18 + rr() * 10, 1);
      sp.userData = { x, sp: 0.4 + rr() * 0.6 }; hm.add(sp);
    }
    const lowMist = hillMist.clone();
    for (let i = 0; i < 10; i++) {
      const sp = new T.Sprite(lowMist);
      const x = -120 + rr() * 240, z = -70 - rr() * 70;
      sp.position.set(x, 2.5 + rr() * 3, z); sp.scale.set(50 + rr() * 40, 7 + rr() * 4, 1);
      sp.userData = { x, sp: 0.6 + rr() * 0.8 }; hm.add(sp);
    }
    scene.add(hm);
    cloudMesh.userData.hillMist = { mat: hillMist, low: lowMist, group: hm };
  }

  /* ------------------------------------------------------------------ */
  /* Material de objetos (cel shading com cor por vértice)               */
  /* ------------------------------------------------------------------ */
  const SWAY = `
      float gst=0.5+0.5*sin(uTime*1.7+w0.x*0.25+w0.z*0.15);
      w0.xz+=uWind*(0.35+gst*0.65)*0.09*aSway;
      w0.y+=sin(uTime*6.0+w0.x*3.0+w0.z*2.0)*0.012*aSway;`;
  const OBJ_VS = `
    attribute vec3 color; attribute float aGlow; attribute float aSway;
    uniform float uTime; uniform vec2 uWind;
    varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vGlow;
    void main(){
      vec3 p=position;
      vec4 w0=modelMatrix*vec4(p,1.0);
      ${SWAY}
      vW=w0.xyz; vN=normalize(mat3(modelMatrix)*normal); vC=color; vGlow=aGlow;
      gl_Position=projectionMatrix*viewMatrix*w0;
    }`;
  const OBJ_FS = `${COMMON}${NOISE}
    varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vGlow;
    void main(){
      if(uReflect>0.5 && vW.y<-0.02) discard;
      vec3 n=normalize(vN);
      float ndl=dot(n,uSun);
      float band=mix(0.6,0.84,smoothstep(-0.05,0.08,ndl)); band=mix(band,1.0,smoothstep(0.45,0.58,ndl));
      vec3 c=vC*band;
      c+=vC*0.08*smoothstep(0.55,0.95,1.0-abs(dot(n,normalize(cameraPosition-vW))));
      c*=0.94+0.06*snoise(vW.xy*3.0+vW.z);
      vec3 nc=nightTint(c);
      nc+=lanternGlow(vW)*0.9;
      c=mix(c,nc,uNight);
      c=mix(c,vec3(1.0,0.72,0.36)*1.15,vGlow*max(uNight,uDusk*0.75));
      c=mix(c,c*1.08+vec3(0.06,0.05,0.02),vGlow*(1.0-uNight)*0.3);
      gl_FragColor=vec4(applyFog(c,vW),1.0);
    }`;
  const objMat = mat(OBJ_VS, OBJ_FS);

  // Contorno de desenho: casco invertido, empurrado pela normal
  const OUTLINE_VS = `
    attribute float aSway; uniform float uTime; uniform vec2 uWind; uniform float uWidth;
    varying vec3 vW;
    void main(){
      vec4 w0=modelMatrix*vec4(position+normal*uWidth,1.0);
      ${SWAY}
      vW=w0.xyz; gl_Position=projectionMatrix*viewMatrix*w0;
    }`;
  const OUTLINE_FS = `${COMMON}
    uniform vec3 uLine; varying vec3 vW;
    void main(){ if(uReflect>0.5 && vW.y<-0.02) discard; vec3 c=mix(uLine,uLine*0.45,uNight); gl_FragColor=vec4(applyFog(c,vW),1.0); }`;
  const outlineMat = (width, color) => mat(OUTLINE_VS, OUTLINE_FS, { uWidth: { value: width }, uLine: { value: col(color) } }, { side: T.BackSide });

  // Monta várias geometrias num único buffer, com cor, brilho e balanço
  function Builder() {
    const P = [], N = [], C = [], Gl = [], S = [], I = []; let off = 0;
    const m4 = new T.Matrix4(), nm = new T.Matrix3(), v = new T.Vector3();
    return {
      add(geo, matrix, color, glow = 0, sway = 0) {
        const g = geo.index ? geo.toNonIndexed() : geo;
        if (!g.attributes.normal) g.computeVertexNormals();
        const p = g.attributes.position, n = g.attributes.normal;
        const fixed = typeof color === "function" ? null : new T.Color(color); const tmp = new T.Color();
        nm.getNormalMatrix(matrix);
        for (let i = 0; i < p.count; i++) {
          let c = fixed;
          if (!c) {
            const t0 = i - (i % 3); const at = g.attributes.aT;
            const tv = at ? (at.getX(t0) + at.getX(t0 + 1) + at.getX(t0 + 2)) / 3 : 0;
            c = tmp.set(color((p.getX(t0) + p.getX(t0 + 1) + p.getX(t0 + 2)) / 3, (p.getY(t0) + p.getY(t0 + 1) + p.getY(t0 + 2)) / 3, (p.getZ(t0) + p.getZ(t0 + 1) + p.getZ(t0 + 2)) / 3, tv));
          }
          v.fromBufferAttribute(p, i).applyMatrix4(matrix); P.push(v.x, v.y, v.z);
          v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); N.push(v.x, v.y, v.z);
          C.push(c.r, c.g, c.b); Gl.push(glow);
          S.push(typeof sway === "function" ? sway(i, p, g) : sway);
          I.push(off + i);
        }
        off += p.count;
      },
      build() {
        const g = new T.BufferGeometry();
        g.setAttribute("position", new T.Float32BufferAttribute(P, 3));
        g.setAttribute("normal", new T.Float32BufferAttribute(N, 3));
        g.setAttribute("color", new T.Float32BufferAttribute(C, 3));
        g.setAttribute("aGlow", new T.Float32BufferAttribute(Gl, 1));
        g.setAttribute("aSway", new T.Float32BufferAttribute(S, 1));
        g.setIndex(I);
        return g;
      },
    };
  }
  const M = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(sx, sy, sz));

  // Viga curva (kasagi e shimaki do torii): perfil retangular varrido ao longo de x
  function curvedBeam(len, depth, height, curve, flare, segs = 48) {
    const pos = [];
    const prof = (t) => {
      const x = (t - 0.5) * len; const k = Math.abs(2 * x / len);
      const lift = curve * Math.pow(k, 2.6);
      const ext = flare * Math.pow(k, 10) * Math.sign(x);
      return { x, lift, ext };
    };
    const ridge = height * 0.18;
    const corners = (t) => {
      const { x, lift, ext } = prof(t);
      return [
        [x, lift, -depth / 2], [x, lift, depth / 2],
        [x + ext, lift + height, depth / 2], [x + ext, lift + height + ridge, 0], [x + ext, lift + height, -depth / 2],
      ];
    };
    const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let i = 0; i < segs; i++) {
      const A = corners(i / segs), B = corners((i + 1) / segs);
      quad(A[0], B[0], B[1], A[1]);
      quad(A[1], B[1], B[2], A[2]);
      quad(A[2], B[2], B[3], A[3]);
      quad(A[3], B[3], B[4], A[4]);
      quad(A[4], B[4], B[0], A[0]);
    }
    const L = corners(0), R = corners(1);
    pos.push(...L[0], ...L[1], ...L[2], ...L[0], ...L[2], ...L[3], ...L[0], ...L[3], ...L[4]);
    pos.push(...R[0], ...R[2], ...R[1], ...R[0], ...R[3], ...R[2], ...R[0], ...R[4], ...R[3]);
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    return g;
  }

  /* ------------------------------------------------------------------ */
  /* Torii (myōjin) com lanternas de pedra e caminho                     */
  /* ------------------------------------------------------------------ */
  const TORII = { x: 9.5, z: -15, rot: -0.22 };
  let plaque;
  {
    const gy = heightAt(TORII.x, TORII.z) - 0.05;
    const B = Builder();
    const SHU = "#CF3B22", SHU_D = "#B53019", KURO = "#221E1F", STONE = "#8F8D84", STONE_D = "#77756D";
    const halfSpan = 2.75;
    for (const sx of [-1, 1]) {
      const lean = -sx * 0.028;
      B.add(new T.CylinderGeometry(0.3, 0.35, 6.4, 28, 1), M(sx * halfSpan, 3.45, 0, 0, 0, lean), SHU);
      B.add(new T.CylinderGeometry(0.4, 0.42, 0.62, 28), M(sx * (halfSpan + 0.008), 0.62, 0), KURO);   // nemaki
      B.add(new T.CylinderGeometry(0.43, 0.43, 0.06, 28), M(sx * (halfSpan + 0.008), 0.95, 0), KURO);
      B.add(new T.CylinderGeometry(0.62, 0.7, 0.36, 8), M(sx * halfSpan, 0.16, 0), STONE);              // daiishi
      B.add(new T.CylinderGeometry(0.74, 0.8, 0.12, 8), M(sx * halfSpan, -0.02, 0), STONE_D);
      B.add(new T.BoxGeometry(0.2, 0.34, 0.12), M(sx * (halfSpan + 0.48), 4.55, 0.2), KURO);             // kusabi
      B.add(new T.BoxGeometry(0.2, 0.34, 0.12), M(sx * (halfSpan + 0.48), 4.55, -0.2), KURO);
    }
    B.add(new T.BoxGeometry(7.3, 0.36, 0.28), M(0, 4.55, 0), SHU);                                        // nuki
    B.add(new T.BoxGeometry(0.34, 1.12, 0.26), M(0, 5.25, 0), SHU_D);                                    // gakuzuka
    B.add(new T.BoxGeometry(1.02, 1.38, 0.1), M(0, 5.3, 0.17), KURO);                                    // moldura da placa
    B.add(curvedBeam(7.9, 0.4, 0.36, 0.2, 0.05), M(0, 5.86, 0), SHU);                                    // shimaki
    B.add(curvedBeam(9.4, 0.62, 0.42, 0.62, 0.32), M(0, 6.24, 0), KURO);                                // kasagi
    B.add(curvedBeam(9.1, 0.54, 0.05, 0.6, 0.3), M(0, 6.2, 0), SHU_D);                                  // filete sob o kasagi

    // Lanternas de pedra (ishidōrō) dos dois lados
    const lantProfile = [[0.62, 0], [0.62, 0.16], [0.46, 0.22], [0.3, 0.34], [0.22, 0.42], [0.2, 1.25], [0.28, 1.32], [0.4, 1.38], [0.44, 1.48], [0.0, 1.5]].map(([r, y]) => new T.Vector2(r, y));
    const lanternPos = [];
    for (const sx of [-1, 1]) {
      const lx = sx * 4.7, lz = 2.2;
      B.add(new T.LatheGeometry(lantProfile, 10), M(lx, 0, lz), STONE);
      B.add(new T.BoxGeometry(0.74, 0.66, 0.74), M(lx, 1.83, lz), STONE);
      for (const [fx, fz, ry] of [[0, 0.375, 0], [0, -0.375, 0], [0.375, 0, Math.PI / 2], [-0.375, 0, Math.PI / 2]])
        B.add(new T.PlaneGeometry(0.3, 0.3), M(lx + fx, 1.86, lz + fz, 0, ry, 0), "#F3D9A0", 1);
      B.add(new T.ConeGeometry(0.88, 0.5, 4, 1), M(lx, 2.42, lz, 0, Math.PI / 4, 0, 1, 1, 1), STONE_D);
      B.add(new T.CylinderGeometry(0.62, 0.62, 0.08, 4), M(lx, 2.16, lz, 0, Math.PI / 4, 0), STONE_D);
      B.add(new T.SphereGeometry(0.13, 12, 8), M(lx, 2.72, lz), STONE);
      B.add(new T.ConeGeometry(0.09, 0.16, 10), M(lx, 2.88, lz), STONE);
      lanternPos.push([lx, lz]);
    }

    // Pedras do caminho até o torii
    const rr = mulberry(5);
    const pathPts = [];
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const px = 6.6 + (TORII.x - 6.6) * t + Math.sin(t * 3.0) * 1.2;
      const pz = 14.6 + (TORII.z + 4.8 - 14.6) * t;
      pathPts.push([px, pz]);
    }
    const group = new T.Group();
    const geo = B.build();
    const toriiMesh = new T.Mesh(geo, objMat);
    group.add(toriiMesh);
    group.position.set(TORII.x, gy, TORII.z);
    group.rotation.y = TORII.rot;
    scene.add(group);
    group.updateMatrixWorld(true);
    lanternPos.forEach(([lx, lz], i) => {
      const w = new T.Vector3(lx, 1.86, lz).applyMatrix4(group.matrixWorld);
      U.uLanterns.value[i].copy(w);
    });

    const SB = Builder();
    pathPts.forEach(([px, pz], i) => {
      const s = 0.55 + rr() * 0.35;
      SB.add(new T.CylinderGeometry(s, s * 1.08, 0.16, 7), M(px, heightAt(px, pz) + 0.03, pz, 0, rr() * 3, 0, 1, 1, 0.7 + rr() * 0.3), i % 3 ? "#9C9A90" : "#8A887E");
    });
    scene.add(new T.Mesh(SB.build(), objMat));

    // Placa (gaku) com o kanji 旅
    const pc = document.createElement("canvas"); pc.width = 128; pc.height = 176;
    const drawPlaque = () => {
      const g2 = pc.getContext("2d");
      g2.fillStyle = "#1C1718"; g2.fillRect(0, 0, 128, 176);
      g2.strokeStyle = "#C9A24A"; g2.lineWidth = 6; g2.strokeRect(9, 9, 110, 158);
      g2.fillStyle = "#D8B456"; g2.textAlign = "center"; g2.textBaseline = "middle";
      g2.font = "800 92px 'Shippori Mincho', 'Hiragino Mincho ProN', serif";
      g2.fillText("旅", 64, 92);
    };
    drawPlaque();
    const ptex = new T.CanvasTexture(pc);
    plaque = new T.Mesh(new T.PlaneGeometry(0.86, 1.2), new T.ShaderMaterial({
      uniforms: Object.assign({}, U, { map: { value: ptex } }),
      vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `${COMMON} uniform sampler2D map; varying vec2 vUv; varying vec3 vW;
        void main(){ vec3 c=texture2D(map,vUv).rgb; c=mix(c,nightTint(c)+lanternGlow(vW)*0.6,uNight); gl_FragColor=vec4(applyFog(c,vW),1.0); }`,
    }));
    plaque.position.set(0, 5.3, 0.23);
    group.add(plaque);
    plaque.userData.redraw = () => { drawPlaque(); ptex.needsUpdate = true; };
  }

  /* ------------------------------------------------------------------ */
  /* Árvores em estilo Ghibli: copas com folhagem recortada e luz no topo */
  /* ------------------------------------------------------------------ */
  {
    const leafMat = mat(`${NOISE}
      uniform float uTime; uniform vec2 uWind; attribute vec3 color; attribute float aSway; attribute vec3 aCenter;
      varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec3 vL;
      void main(){
        vec3 p=position; vec4 w=modelMatrix*vec4(p,1.0);
        float sw=aSway*(sin(uTime*1.3+w.x*0.2+w.z*0.15)*0.12+snoise(w.xz*0.05+uTime*0.3)*0.1);
        w.xz+=uWind*sw; vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); vC=color; vL=position-aCenter;
        gl_Position=projectionMatrix*viewMatrix*w;
      }`, `${COMMON}${NOISE}
      varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec3 vL;
      void main(){
        vec3 n=normalize(vN);
        float leaf=snoise(vW.xy*1.6+vW.z*0.9)*0.5+snoise(vW.zy*2.7-vW.x*0.6)*0.35;
        float l=dot(n,uSun)+leaf*0.32;
        float up=smoothstep(-0.2,0.9,n.y);
        vec3 dark=vC*vec3(0.42,0.55,0.62), mid=vC, lit=mix(vC,vec3(0.86,0.9,0.5),0.42), hi=vec3(0.92,0.95,0.62);
        vec3 c=mix(dark,mid,smoothstep(-0.15,0.05,l));
        c=mix(c,lit,smoothstep(0.32,0.46,l)*mix(0.6,1.0,up));
        c=mix(c,hi,smoothstep(0.62,0.72,l)*up*0.5);
        vec3 V=normalize(cameraPosition-vW);
        c+=vec3(0.9,0.95,0.6)*smoothstep(0.6,0.95,1.0-abs(dot(n,V)))*0.12*(1.0-uNight);
        c=mix(c,nightTint(c),uNight); c+=lanternGlow(vW)*uNight*0.5;
        gl_FragColor=vec4(applyFog(c,vW),1.0);
      }`);
    const CB = [], TB = Builder(), rT = mulberry(31);
    const canopy = { P: [], N: [], C: [], S: [], Ce: [] };
    const addBlob = (geo, m, color, sway, center) => {
      const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals();
      const p = g.attributes.position, nn = g.attributes.normal, nm = new T.Matrix3().getNormalMatrix(m), v = new T.Vector3(), cc = new T.Color(color);
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(m); canopy.P.push(v.x, v.y, v.z);
        v.fromBufferAttribute(nn, i).applyMatrix3(nm).normalize(); canopy.N.push(v.x, v.y, v.z);
        canopy.C.push(cc.r, cc.g, cc.b); canopy.S.push(sway); canopy.Ce.push(center.x, center.y, center.z);
      }
    };
    const GREENS = ["#4C7C46", "#5A8A4C", "#3E6E42", "#6A9450", "#527E3E"];
    const broadleaf = (x, y, z, s) => {
      TB.add(new T.CylinderGeometry(0.16 * s, 0.32 * s, 3.4 * s, 8), M(x, y + 1.6 * s, z, 0, 0, (rT() - 0.5) * 0.1), "#5B4636");
      for (let k = 0; k < 3; k++) { const a = rT() * Math.PI * 2; TB.add(new T.CylinderGeometry(0.06 * s, 0.12 * s, 1.6 * s, 6), M(x + Math.cos(a) * 0.5 * s, y + 3.0 * s, z + Math.sin(a) * 0.5 * s, Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6), "#5B4636"); }
      const base = GREENS[Math.floor(rT() * GREENS.length)], ctr = new T.Vector3(x, y + 4.2 * s, z);
      const n = 9 + Math.floor(rT() * 6);
      for (let i = 0; i < n; i++) {
        const a = rT() * Math.PI * 2, rad = (0.5 + rT() * 1.3) * s, py = y + (3.4 + rT() * 2.4) * s, pr = (1.0 + rT() * 0.9) * s;
        addBlob(new T.IcosahedronGeometry(pr, 3), M(x + Math.cos(a) * rad, py, z + Math.sin(a) * rad * 0.85), base, 1, ctr);
      }
    };
    const cypress = (x, y, z, s) => {
      TB.add(new T.CylinderGeometry(0.12 * s, 0.2 * s, 1.6 * s, 6), M(x, y + 0.8 * s, z), "#4E3C30");
      const ctr = new T.Vector3(x, y + 4 * s, z);
      for (let k = 0; k < 6; k++) addBlob(new T.IcosahedronGeometry((1.15 - k * 0.15) * s, 2), M(x + (rT() - 0.5) * 0.3 * s, y + (1.8 + k * 1.05) * s, z, 0, 0, 0, 1, 1.35, 1), "#3A6440", 0.7, ctr);
    };
    const bush = (x, y, z, s) => { const ctr = new T.Vector3(x, y + 0.6 * s, z); for (let k = 0; k < 4; k++) { const a = rT() * Math.PI * 2; addBlob(new T.IcosahedronGeometry((0.55 + rT() * 0.35) * s, 2), M(x + Math.cos(a) * 0.6 * s, y + 0.5 * s, z + Math.sin(a) * 0.5 * s), "#4E8044", 0.4, ctr); } };
    const spots = [[-38, -58], [-44, -62], [-33, -66], [-92, -84], [-86, -90], [52, -62], [60, -58], [57, -70], [118, -104], [-150, -170], [-160, -164], [26, -150], [-20, -200], [160, -220],
      [-70, -40], [-76, -48], [-110, -60], [-120, -20], [-130, 4], [96, -40], [104, -30], [130, -60], [140, -10], [-58, 30], [-68, 22], [44, 30], [60, 22], [80, -120], [-40, -120], [-100, -140], [120, -150], [-10, -130], [20, -112]];
    spots.forEach(([x, z], i) => {
      const y = heightAt(x, z); if (y < 0.35) return;
      const s = 0.85 + rT() * 0.8;
      if (i % 5 === 3) cypress(x, y, z, s); else broadleaf(x, y, z, s);
      if (rT() < 0.6) bush(x + 2.5 + rT() * 2, heightAt(x + 3, z + 1), z + 1 + rT() * 2, 0.8 + rT() * 0.6);
    });
    for (let i = 0; i < 40; i++) { const x = (rT() - 0.5) * 260, z = -20 - rT() * 180, y = heightAt(x, z); if (y < 0.5) continue; bush(x, y, z, 0.6 + rT() * 0.7); }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(canopy.P, 3)); g.setAttribute("normal", new T.Float32BufferAttribute(canopy.N, 3));
    g.setAttribute("color", new T.Float32BufferAttribute(canopy.C, 3)); g.setAttribute("aSway", new T.Float32BufferAttribute(canopy.S, 1)); g.setAttribute("aCenter", new T.Float32BufferAttribute(canopy.Ce, 3));
    scene.add(new T.Mesh(g, leafMat));
    scene.add(new T.Mesh(TB.build(), objMat));
  }

  /* Bandos de pássaros cruzando o céu */
  const birds = (() => {
    const flocks = [];
    const wingG = new T.BufferGeometry(); wingG.setAttribute("position", new T.Float32BufferAttribute([0, 0, 0, -1, 0.1, -0.3, -0.2, 0, 0.3, 0, 0, 0, 1, 0.1, -0.3, 0.2, 0, 0.3], 3)); wingG.computeVertexNormals();
    const bm = new T.MeshBasicMaterial({ color: 0x2a2a34, side: T.DoubleSide, fog: false });
    const rb = mulberry(808);
    for (let f = 0; f < 3; f++) {
      const g = new T.Group(); const list = [];
      for (let i = 0; i < 7 + f * 2; i++) { const b = new T.Mesh(wingG.clone(), bm); const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1; b.userData = { off: new T.Vector3(-row * 1.8, (rb() - 0.5) * 0.6, side * row * 1.4), ph: rb() * 6 }; b.scale.setScalar(0.9); g.add(b); list.push(b); }
      scene.add(g); flocks.push({ g, list, t: rb() * 80, speed: 9 + f * 2, y: 40 + f * 12, z: -160 - f * 60, dir: f % 2 ? -1 : 1 });
    }
    return (t, dt) => {
      flocks.forEach((F) => {
        F.t += dt;
        const span = 520, x = ((F.t * F.speed) % span) - span / 2;
        F.g.position.set(F.dir * x, F.y + Math.sin(F.t * 0.4) * 4, F.z + Math.sin(F.t * 0.15) * 20);
        F.g.rotation.y = F.dir > 0 ? 0 : Math.PI;
        F.list.forEach((b) => { b.position.copy(b.userData.off); b.position.y += Math.sin(F.t * 1.3 + b.userData.ph) * 0.4; const fl = Math.sin(F.t * 9 + b.userData.ph); const pa = b.geometry.attributes.position; pa.setY(1, fl * 0.7); pa.setY(4, fl * 0.7); pa.needsUpdate = true; });
        const n = U.uNight.value; F.g.visible = n < 0.6;
      });
    };
  })();

  /* ------------------------------------------------------------------ */
  /* O castelo andante                                                   */
  /* ------------------------------------------------------------------ */
  const castle = new T.Group();
  const castleBody = new T.Group();
  castle.add(castleBody);
  const legs = [];
  const chimneyTops = [];
  const castleLine = outlineMat(0.09, "#2A1D18");
  {
    const B = Builder(); const r = mulberry(404);
    // metal grafite azulado, com remendos de ferrugem e a base suja, como no filme
    const HULL = ["#6C7480", "#626A74", "#78808A", "#5A616A", "#707882"];
    const RUSTS = ["#8A5E48", "#7A5040", "#93684C"];
    const hull = (base) => (x, y, z) => {
      const n = Math.sin(x * 2.1 + z * 1.7 + y * 0.6) * Math.sin(y * 2.6 - x * 0.9);
      if (y < -0.5) return "#3E434A";
      return n > 0.62 ? RUSTS[0] : n < -0.7 ? "#454B53" : base;
    };
    const RUST = HULL.map((c) => hull(c));
    const METAL = "#3E434A", METAL_D = "#2C3036", WOOD = "#7B5A3E", CANVAS = "#C9BBA0", COPPER = "#6F8D7E", SLATE = "#7C8A96";
    const WALL = ["#ECE2CF", "#E2D3B8", "#D9CDB6"], ROOF = ["#A8473A", "#8E3C33", "#5E6B76", "#7C4A3A"];

    // ===== Corpo refeito pela referência do filme =====
    const BROWN = (x, y, z) => { const n = Math.sin(x * 2.3 + y * 1.1) * Math.sin(z * 1.9 - y * 0.7); return n > 0.5 ? "#9A6E4E" : n < -0.5 ? "#6A4A36" : "#83604A"; };
    const DOME = "#7E8A96", DOME_D = "#5E6A76", DOME_L = "#9AA6B0", BAND = "#4E5862";
    const PLANK = (x, y, z) => (Math.floor((y + 20) * 2.2) % 2 ? "#7A5A40" : "#6A4C36");
    // base de ferrugem e madeira, larga e irregular
    [[0.4, 9.0, 0, 6.2, 2.9, 4.4], [-3.0, 9.6, 0.2, 4.2, 2.8, 3.8], [3.6, 8.8, 0, 3.6, 2.6, 3.4], [0.8, 7.4, 0, 4.6, 1.6, 3.4]]
      .forEach(([x, y, z, sx, sy, sz]) => B.add(new T.SphereGeometry(1, 28, 18), M(x, y, z, 0, 0, 0, sx, sy, sz), BROWN));
    // tábuas e chapas na base
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2, y = 7.4 + r() * 4.0, rad = 4.5 - Math.abs(y - 9.2) * 0.45;
      B.add(new T.BoxGeometry(1.3 + r() * 1.2, 0.7 + r() * 0.8, 0.2), M(Math.cos(a) * rad * 1.36, y, Math.sin(a) * rad, (r() - 0.5) * 0.3, -a + Math.PI / 2, (r() - 0.5) * 0.4), i % 3 === 0 ? "#5E6A76" : i % 3 === 1 ? "#7A5A40" : "#8C6448");
    }
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; B.add(new T.SphereGeometry(0.12, 6, 4), M(Math.cos(a) * 6.0, 10.3 + Math.sin(a * 4) * 0.2, Math.sin(a) * 4.4), METAL_D); }
    // boca: maxilar que se projeta, com dentes, e a plataforma
    B.add(new T.BoxGeometry(1.6, 1.4, 3.8), M(6.2, 8.4, 0), "#1E1614");
    for (let i = 0; i < 7; i++) B.add(new T.ConeGeometry(0.22, 0.6, 4), M(6.9, 8.9, -1.5 + i * 0.5, Math.PI, 0, 0), "#E2D8C4");
    for (let i = 0; i < 6; i++) B.add(new T.ConeGeometry(0.2, 0.5, 4), M(7.0, 7.9, -1.25 + i * 0.5), "#E2D8C4");
    B.add(new T.BoxGeometry(2.4, 0.5, 4.2), M(7.2, 7.5, 0, 0, 0, -0.18), BROWN);
    B.add(new T.BoxGeometry(2.6, 0.22, 1.8), M(8.2, 6.9, 0, 0, 0, -0.1), WOOD);
    // cúpulas como elmos: casco cinza, cintas rebitadas e vigias redondas
    const dome = (x, y, z, R, h, vig) => {
      B.add(new T.SphereGeometry(R, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M(x, y, z), (px, py) => (py > R * 0.82 ? DOME_L : DOME));
      B.add(new T.CylinderGeometry(R, R * 1.04, h, 32, 1, true), M(x, y - h / 2, z), DOME_D);
      B.add(new T.TorusGeometry(R * 1.02, 0.16, 8, 40), M(x, y + 0.02, z, Math.PI / 2, 0, 0), BAND);
      B.add(new T.TorusGeometry(R * 1.05, 0.2, 8, 40), M(x, y - h, z, Math.PI / 2, 0, 0), BAND);
      B.add(new T.TorusGeometry(R * 0.72, 0.12, 8, 32), M(x, y + R * 0.68, z, Math.PI / 2, 0, 0), BAND);
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; B.add(new T.SphereGeometry(0.08, 5, 4), M(x + Math.cos(a) * R * 1.03, y - h * 0.5, z + Math.sin(a) * R * 1.03), METAL_D); }
      vig.forEach(([a, dy, rr]) => {
        const px = x + Math.cos(a) * R * 0.98, pz = z + Math.sin(a) * R * 0.98, Mv = M(px, y + dy, pz, 0, -a + Math.PI / 2, 0);
        B.add(new T.TorusGeometry(rr, rr * 0.28, 8, 18), Mv, "#3E464E");
        B.add(new T.CircleGeometry(rr * 0.9, 16), Mv.clone().multiply(M(0, 0, 0.02)), "#1A1E22", 1);
      });
    };
    dome(1.8, 12.2, 0, 3.7, 1.6, [[0, 1.0, 0.55], [0.6, 1.4, 0.4], [-0.6, 1.4, 0.4], [1.3, 0.8, 0.35], [-1.3, 0.8, 0.35]]);
    dome(-2.8, 12.6, 0.4, 3.0, 1.4, [[2.6, 1.0, 0.4], [3.4, 0.9, 0.35], [2.0, 1.4, 0.32]]);
    dome(0.2, 16.2, -0.2, 2.6, 1.2, [[0, 0.9, 0.4], [0.9, 1.0, 0.3], [-0.9, 1.0, 0.3]]);
    dome(-3.4, 15.6, -1.4, 1.6, 0.9, [[2.4, 0.6, 0.26]]);
    // olhos-canhão na frente da cúpula maior
    for (const z of [-1.3, 1.3]) {
      B.add(new T.CylinderGeometry(0.6, 0.7, 1.6, 16), M(5.6, 11.4, z, 0, 0, -Math.PI / 2), "#4E5862");
      B.add(new T.TorusGeometry(0.64, 0.14, 8, 18), M(6.4, 11.4, z, 0, Math.PI / 2, 0), "#3A424A");
      B.add(new T.CircleGeometry(0.5, 16), M(6.43, 11.4, z, 0, Math.PI / 2, 0), "#141618");
    }
    // paredes de tábuas e varandas entre as cúpulas
    for (const [x, y, z, w, h, ry] of [[-0.6, 13.8, 3.0, 3.6, 2.2, 0.1], [3.4, 14.4, -2.4, 2.6, 2.0, 2.8], [-4.4, 13.4, 2.2, 2.2, 1.8, 0.6], [4.6, 12.6, 2.6, 2.0, 1.6, -0.5]]) {
      B.add(new T.BoxGeometry(w, h, 0.24), M(x, y, z, 0, ry, 0), PLANK);
      B.add(new T.BoxGeometry(w + 0.2, 0.12, 0.6), M(x, y - h / 2, z, 0, ry, 0), WOOD);
      for (let k = 0; k <= 5; k++) B.add(new T.BoxGeometry(0.06, 0.5, 0.06), M(x + Math.cos(ry) * (-w / 2 + k * w / 5), y - h / 2 + 0.3, z - Math.sin(ry) * (-w / 2 + k * w / 5) + 0.25 * Math.cos(ry)), WOOD);
    }
    // asas de lona com nervuras, na traseira
    for (const sz of [-1, 1]) {
      const wing = new T.Shape(); wing.moveTo(0, 0); wing.bezierCurveTo(-2.5, 1.6, -6.5, 1.8, -8.2, -0.6); wing.bezierCurveTo(-6.6, -1.4, -4.8, -2.6, -2.6, -3.2); wing.bezierCurveTo(-1.6, -2.2, -0.6, -1.2, 0, 0);
      const Mw = M(-4.6, 12.0, sz * 3.6, sz * 0.5, sz * 0.55, 0.15);
      B.add(new T.ShapeGeometry(wing, 12), Mw, "#C9CDD2", 0, 0.5);
      B.add(new T.ShapeGeometry(wing, 12), Mw.clone().multiply(M(0, 0, -0.03, 0, Math.PI, 0, -1, 1, 1)), "#B4B8BE", 0, 0.5);
      for (let k = 0; k < 4; k++) { const a = 0.18 - k * 0.22, len = 6.6 - k * 1.1; B.add(new T.CylinderGeometry(0.05, 0.04, len, 5), Mw.clone().multiply(M(-Math.cos(a) * len / 2, Math.sin(a) * len / 2, 0.03, 0, 0, Math.PI / 2 - a)), "#6A6E74"); }
    }
    // chaminés altas de ferrugem, algumas tortas
    [[-1.6, 17.0, -1.2, 7.0, 0.04, 0.42], [-0.4, 18.0, -2.0, 8.2, -0.05, 0.5], [1.2, 17.4, -1.6, 6.4, 0.08, 0.38], [-3.6, 16.8, 0.2, 5.0, 0.12, 0.34], [2.8, 15.4, 1.2, 4.0, -0.15, 0.32]]
      .forEach(([x, y, z, h, lean, rr]) => {
        const Mc = M(x, y + h / 2 - 1, z, 0, 0, lean);
        B.add(new T.CylinderGeometry(rr, rr * 1.15, h, 12), Mc, (px, py) => (Math.floor((py + h) * 1.4) % 3 === 0 ? "#6A4A36" : "#8A5E44"));
        B.add(new T.CylinderGeometry(rr * 1.35, rr * 0.95, 0.5, 12), Mc.clone().multiply(M(0, h / 2 + 0.2, 0)), "#3A3236");
        for (const fy of [-0.25, 0.1]) B.add(new T.TorusGeometry(rr * 1.08, 0.07, 6, 14), Mc.clone().multiply(M(0, h * fy, 0, Math.PI / 2, 0, 0)), "#3A3236");
        chimneyTops.push(new T.Vector3(0, h / 2 + 0.6, 0).applyMatrix4(Mc));
      });
    // mastros, guindastes e cabos no alto
    for (const [x, z, h, ang] of [[2.6, 0.6, 5.2, 0.6], [-2.2, 1.6, 4.4, -0.8]]) {
      B.add(new T.CylinderGeometry(0.06, 0.08, h, 6), M(x, 18 + h / 2, z), "#3A3236");
      B.add(new T.CylinderGeometry(0.05, 0.05, 3.2, 6), M(x + Math.cos(ang) * 1.4, 18 + h - 0.6, z + Math.sin(ang) * 1.4, 0, -ang, Math.PI / 2 - 0.35), "#3A3236");
      B.add(new T.CylinderGeometry(0.015, 0.015, 3.6, 4), M(x + Math.cos(ang) * 1.6, 18 + h - 2.2, z + Math.sin(ang) * 1.6, 0, 0, 0.3), "#2A2420");
    }
    B.add(new T.CylinderGeometry(0.02, 0.02, 9, 4), M(0.2, 21.5, 0.8, 0.2, 0, 1.2), "#2A2420");
    // Casinhas com telhado de duas águas e janelas que acendem à noite
    const house = (x, y, z, w, h, d, ry, wall, roof) => {
      const Mh = M(x, y, z, 0, ry, 0);
      B.add(new T.BoxGeometry(w, h, d), Mh, wall);
      const rr = d * 0.64;
      B.add(new T.CylinderGeometry(rr, rr, w * 1.12, 3, 1, false, Math.PI / 2), Mh.clone().multiply(M(0, h / 2 + rr * 0.5, 0, 0, 0, Math.PI / 2)), roof);
      B.add(new T.PlaneGeometry(w * 0.24, h * 0.34), Mh.clone().multiply(M(-w * 0.22, 0.04, d / 2 + 0.02)), "#2D2624", 1);
      B.add(new T.PlaneGeometry(w * 0.24, h * 0.34), Mh.clone().multiply(M(w * 0.22, 0.04, d / 2 + 0.02)), "#2D2624", 1);
      B.add(new T.PlaneGeometry(w * 0.24, h * 0.34), Mh.clone().multiply(M(0, 0.04, -d / 2 - 0.02, 0, Math.PI, 0)), "#2D2624", 1);
    };
    [[-4.8, 9.4, 3.6, 1.6, 1.3, 1.3, 0.7], [4.4, 8.6, 3.2, 1.4, 1.2, 1.2, -0.6], [1.6, 7.0, 3.6, 1.5, 1.1, 1.2, 0.0],
     [-5.4, 10.8, -2.6, 1.6, 1.2, 1.4, 2.6], [1.4, 10.6, -4.2, 1.7, 1.2, 1.3, 3.1], [-1.4, 6.6, -3.2, 1.3, 1.0, 1.1, 2.9],
     [-2.4, 17.6, 1.4, 1.2, 1.0, 1.0, 0.4], [2.4, 18.0, 0.0, 1.1, 0.9, 1.0, -0.3]]
      .forEach(([x, y, z, w, h, d, ry], i) => house(x, y, z, w, h, d, ry, WALL[i % 3], ROOF[i % 4]));

    // Torres com cone e mastro
    const turret = (x, y, z, rr, h, roof) => {
      B.add(new T.CylinderGeometry(rr, rr * 1.08, h, 14), M(x, y, z), WALL[0]);
      B.add(new T.ConeGeometry(rr * 1.35, h * 0.62, 14), M(x, y + h / 2 + h * 0.31, z), roof);
      B.add(new T.CylinderGeometry(0.05, 0.05, 1.6, 5), M(x, y + h / 2 + h * 0.62 + 0.6, z), METAL_D);
      B.add(new T.BoxGeometry(0.7, 0.32, 0.03), M(x + 0.38, y + h / 2 + h * 0.62 + 1.2, z), "#C22026", 0, 1.2);
      B.add(new T.PlaneGeometry(0.24, 0.36), M(x, y + h * 0.1, z + rr + 0.02), "#2D2624", 1);
      B.add(new T.PlaneGeometry(0.24, 0.36), M(x + rr + 0.02, y + h * 0.1, z, 0, Math.PI / 2, 0), "#2D2624", 1);
    };
    turret(0.4, 19.4, 0.6, 0.8, 3.0, ROOF[0]);
    turret(4.2, 14.6, 1.8, 0.55, 2.2, ROOF[2]);
    turret(-4.6, 14.8, 1.6, 0.5, 2.0, ROOF[1]);

    const bodyGeo = B.build();
    castleBody.add(new T.Mesh(bodyGeo, objMat));
    castleBody.add(new T.Mesh(bodyGeo, castleLine));

    // Pernas de ave com joelho invertido e pés de três dedos
    const LEG = "#34383E";
    const thighGeo = (() => { const b = Builder();
      b.add(new T.CylinderGeometry(0.46, 0.32, 3.6, 10), M(0, -1.8, 0), LEG);
      b.add(new T.SphereGeometry(0.62, 12, 8), M(0, 0, 0), METAL_D);
      b.add(new T.CylinderGeometry(0.62, 0.5, 1.2, 10, 1, true), M(0, -0.7, 0), HULL[1]);
      b.add(new T.SphereGeometry(0.4, 12, 8), M(0, -3.6, 0), METAL_D);
      return b.build(); })();
    const shinGeo = (() => { const b = Builder();
      b.add(new T.CylinderGeometry(0.28, 0.22, 3.8, 10), M(0, -1.9, 0), LEG);
      b.add(new T.BoxGeometry(1.6, 0.22, 0.3), M(0.7, -3.85, 0), LEG);
      b.add(new T.BoxGeometry(1.2, 0.2, 0.26), M(0.5, -3.86, 0.4, 0, -0.55, 0), LEG);
      b.add(new T.BoxGeometry(1.2, 0.2, 0.26), M(0.5, -3.86, -0.4, 0, 0.55, 0), LEG);
      b.add(new T.BoxGeometry(0.8, 0.2, 0.24), M(-0.4, -3.86, 0), LEG);
      return b.build(); })();
    [[2.4, 1.9, 0], [2.4, -1.9, Math.PI], [-2.6, 1.9, Math.PI], [-2.6, -1.9, 0]].forEach(([x, z, ph]) => {
      const hip = new T.Group(); hip.position.set(x, 7.0, z);
      hip.add(new T.Mesh(thighGeo, objMat)); hip.add(new T.Mesh(thighGeo, castleLine));
      const knee = new T.Group(); knee.position.set(0, -3.6, 0); hip.add(knee);
      knee.add(new T.Mesh(shinGeo, objMat)); knee.add(new T.Mesh(shinGeo, castleLine));
      castle.add(hip); legs.push({ hip, knee, ph });
    });
    scene.add(castle);
  }
  /* ------------------------------------------------------------------ */
  /* Torre dos Grimórios na ilhota e o trem sobre os trilhos alagados    */
  /* ------------------------------------------------------------------ */
  const TOWER = new T.Vector3(62, 0, -100);
  const towerBooks = [];
  {
    const gy = Math.max(heightAt(TOWER.x, TOWER.z), 0.25);
    TOWER.y = gy;
    const B = Builder(); const r = mulberry(77);
    const STONE = "#8D8790", STONE_D = "#6E6872", ROOFC = "#2F3E5E";
    B.add(new T.CylinderGeometry(6.4, 7.4, 1.4, 22), M(0, 0.1, 0), "#5E8A4E");
    B.add(new T.CylinderGeometry(7.4, 8.0, 1.2, 22), M(0, -0.95, 0), "#1F3E4A");
    for (let k = 0; k < 7; k++) { const a = r() * Math.PI * 2; B.add(new T.IcosahedronGeometry(0.6 + r() * 0.8, 0), M(Math.cos(a) * (4 + r() * 2), 0.7, Math.sin(a) * (4 + r() * 2)), STONE_D); }
    B.add(new T.CylinderGeometry(2.4, 3.0, 15, 22, 15), M(0, 8.0, 0), (x, y) => (Math.floor((y + 7.5) / 0.75) % 2 ? STONE : "#857F88"));
    for (const y of [5.5, 11]) B.add(new T.CylinderGeometry(3.3, 3.3, 0.35, 24), M(0, y, 0), STONE_D);
    B.add(new T.CylinderGeometry(3.0, 2.7, 3.2, 22), M(0, 16.9, 0), STONE);
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2;
      B.add(new T.PlaneGeometry(0.62, 1.3), M(Math.cos(a) * 3.02, 16.9, Math.sin(a) * 3.02, 0, Math.PI / 2 - a, 0), "#FFD58A", 1);
    }
    for (const [y, a] of [[3.4, 1.4], [7.6, 2.4], [9.8, 0.6], [13.2, 1.9]]) B.add(new T.PlaneGeometry(0.4, 0.9), M(Math.cos(a) * 2.75, y, Math.sin(a) * 2.75, 0, Math.PI / 2 - a, 0), "#FFD58A", 1);
    B.add(new T.ConeGeometry(3.7, 5.6, 22), M(0, 21.3, 0), ROOFC);
    B.add(new T.CylinderGeometry(0.06, 0.06, 2.6, 6), M(0, 25.2, 0), "#2A2A30");
    B.add(new T.PlaneGeometry(1.2, 2.0), M(0, 1.6, 2.95), "#2A1C16");
    const tm = new T.Mesh(B.build(), objMat); tm.position.set(TOWER.x, gy - 0.15, TOWER.z); scene.add(tm);
    const tl = new T.Mesh(tm.geometry, castleLine); tl.position.copy(tm.position); scene.add(tl);
    const covers = ["#4E7A4C", "#A4743A", "#9C3434", "#3E4C86", "#2E6E72", "#2C4A7A", "#5A3E7A", "#7A5A2E", "#4A5560"];
    covers.forEach((c) => {
      const bb = Builder(); bb.add(new T.BoxGeometry(0.75, 1.0, 0.22), M(), c); bb.add(new T.BoxGeometry(0.68, 0.94, 0.24), M(0.03, 0, 0), "#EFE4CC");
      const m = new T.Mesh(bb.build(), objMat); scene.add(m); towerBooks.push(m);
    });
  }
  const TRACK_Z = -33;
  {
    const B = Builder();
    for (let x = -136; x <= 136; x += 1.6) B.add(new T.BoxGeometry(0.22, 0.1, 2.0), M(x, Math.max(heightAt(x, TRACK_Z), 0) + 0.02, TRACK_Z), "#4A3426");
    for (const dz of [-0.62, 0.62]) for (let x = -136; x < 136; x += 4) {
      const y0 = Math.max(heightAt(x, TRACK_Z), 0), y1 = Math.max(heightAt(x + 4, TRACK_Z), 0);
      B.add(new T.BoxGeometry(4.05, 0.09, 0.09), M(x + 2, (y0 + y1) / 2 + 0.11, TRACK_Z + dz, 0, 0, Math.atan2(y1 - y0, 4)), "#5E5A58");
    }
    scene.add(new T.Mesh(B.build(), objMat));
  }
  const train = new T.Group();
  {
    const CREAM = "#E8DCC2", MAROON = "#7A2A26", DARK = "#2E2A2C";
    for (let c = 0; c < 3; c++) {
      const B = Builder(); const x0 = -c * 5.5;
      B.add(new T.BoxGeometry(5, 1.0, 1.7), M(x0, 0.78, 0), MAROON);
      B.add(new T.BoxGeometry(5, 0.92, 1.7), M(x0, 1.74, 0), CREAM);
      B.add(new T.CylinderGeometry(0.95, 0.95, 5.1, 18, 1, false, 0, Math.PI), M(x0, 2.18, 0, 0, 0, Math.PI / 2, 0.42, 1, 1), DARK);
      for (const side of [1, -1]) for (let k = 0; k < 4; k++) B.add(new T.PlaneGeometry(0.72, 0.52), M(x0 - 1.8 + k * 1.2, 1.8, side * 0.86, 0, side > 0 ? 0 : Math.PI, 0), "#FFD58A", 1);
      for (const wx of [-1.7, 1.7]) for (const side of [1, -1]) B.add(new T.CylinderGeometry(0.28, 0.28, 0.12, 12), M(x0 + wx, 0.3, side * 0.78, Math.PI / 2, 0, 0), DARK);
      if (c === 0) { B.add(new T.SphereGeometry(0.18, 10, 8), M(2.55, 1.0, 0), "#FFE9B0", 1); B.add(new T.BoxGeometry(0.1, 1.2, 1.5), M(2.52, 1.75, 0), "#3A3A44"); }
      const m = new T.Mesh(B.build(), objMat); train.add(m); train.add(new T.Mesh(m.geometry, castleLine));
    }
    scene.add(train);
  }


  /* ------------------------------------------------------------------ */
  /* Estação do fim da linha: o rodapé do vale (contato, redes, créditos) */
  /* ------------------------------------------------------------------ */
  const STATION = new T.Vector3(72, 0, TRACK_Z + 3.4);
  const signRedraws = [];
  {
    const gy = Math.max(heightAt(STATION.x, STATION.z), 0.2);
    STATION.y = gy;
    const B = Builder();
    const WOOD = "#7A5A3E", WOOD_D = "#5A4030", ROOF = "#3E5A58", STONE = "#8D8790";
    // plataforma de tábuas com borda de pedra
    B.add(new T.BoxGeometry(15, 0.7, 3.4, 30, 1, 1), M(0, 0.2, 0), (x) => (Math.floor((x + 7.5) / 0.5) % 2 ? WOOD : "#83634A"));
    B.add(new T.BoxGeometry(15.2, 0.16, 0.34), M(0, 0.6, -1.62), STONE);
    for (let k = 0; k < 3; k++) B.add(new T.BoxGeometry(0.8, 0.22, 2.4), M(7.9 + k * 0.75, 0.42 - k * 0.22, 0.2), STONE); // degraus
    for (const x of [-7, -3.5, 0, 3.5, 7]) for (const z of [-1.4, 1.4]) B.add(new T.CylinderGeometry(0.12, 0.14, 1.2, 6), M(x, -0.3, z), WOOD_D);
    // abrigo: quatro postes, parede do fundo e telhado inclinado
    for (const x of [-3.2, 3.2]) for (const z of [-1.2, 1.1]) B.add(new T.CylinderGeometry(0.11, 0.13, 3.0, 8), M(x, 2.0, z), WOOD_D);
    B.add(new T.BoxGeometry(6.6, 2.2, 0.14), M(0, 1.7, -1.22), "#C9B48E");
    B.add(new T.BoxGeometry(6.8, 0.16, 0.2), M(0, 0.68, -1.2), WOOD_D);
    B.add(new T.BoxGeometry(6.8, 0.16, 0.2), M(0, 2.84, -1.2), WOOD_D);
    B.add(new T.BoxGeometry(7.6, 0.18, 3.4), M(0, 3.62, -0.05, 0.16, 0, 0), ROOF);
    B.add(new T.BoxGeometry(7.7, 0.12, 0.2), M(0, 3.38, 1.62, 0.16, 0, 0), "#2E4442");
    // banco
    B.add(new T.BoxGeometry(3.2, 0.12, 0.62), M(1.2, 1.08, -0.6), WOOD);
    B.add(new T.BoxGeometry(3.2, 0.5, 0.08), M(1.2, 1.4, -0.92, -0.12, 0, 0), WOOD);
    for (const x of [-0.2, 2.6]) B.add(new T.BoxGeometry(0.1, 0.52, 0.5), M(x, 0.8, -0.6), WOOD_D);
    // poste com lanterna de chama alaranjada
    B.add(new T.CylinderGeometry(0.08, 0.1, 4.2, 8), M(5.8, 2.6, 0.9), "#2E2A2C");
    B.add(new T.BoxGeometry(0.8, 0.08, 0.08), M(5.5, 4.55, 0.9), "#2E2A2C");
    B.add(new T.BoxGeometry(0.42, 0.56, 0.42), M(5.2, 4.2, 0.9), "#FFB45A", 1);
    B.add(new T.ConeGeometry(0.34, 0.26, 4), M(5.2, 4.6, 0.9, 0, Math.PI / 4, 0), "#2E2A2C");
    // placa da estação sobre dois postes
    for (const x of [-6.4, -3.9]) B.add(new T.CylinderGeometry(0.07, 0.08, 2.9, 6), M(x, 1.95, 1.1), WOOD_D);
    // quadro de avisos (moldura)
    B.add(new T.BoxGeometry(3.0, 1.75, 0.08), M(-1.6, 1.8, -1.12), WOOD_D);
    const sm = new T.Mesh(B.build(), objMat); sm.position.set(STATION.x, gy, STATION.z); scene.add(sm);
    const sl = new T.Mesh(sm.geometry, castleLine); sl.position.copy(sm.position); scene.add(sl);

    const signMat = (canvasEl) => {
      const tex = new T.CanvasTexture(canvasEl); tex.anisotropy = 4;
      return { tex, mat: new T.ShaderMaterial({
        uniforms: Object.assign({}, U, { map: { value: tex } }),
        vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
        fragmentShader: `${COMMON} uniform sampler2D map; varying vec2 vUv; varying vec3 vW;
          void main(){ vec3 c=texture2D(map,vUv).rgb; c=mix(c,nightTint(c)*1.25+lanternGlow(vW)*0.6,uNight); gl_FragColor=vec4(applyFog(c,vW),1.0); }`,
      }) };
    };
    const SERIF = "'Shippori Mincho', 'Hiragino Mincho ProN', serif", MONO = "'JetBrains Mono', ui-monospace, monospace";
    // placa no estilo das estações japonesas
    {
      const c = document.createElement("canvas"); c.width = 640; c.height = 200;
      const draw = () => {
        const g = c.getContext("2d");
        g.fillStyle = "#F4EFE4"; g.fillRect(0, 0, 640, 200);
        g.fillStyle = "#1F3E4A"; g.fillRect(0, 150, 640, 50);
        g.fillStyle = "#C22026"; g.fillRect(0, 142, 640, 8);
        g.fillStyle = "#1C1718"; g.textAlign = "center"; g.textBaseline = "middle";
        g.font = `800 82px ${SERIF}`; g.fillText("終点", 320, 62);
        g.font = `600 22px ${MONO}`; g.fillText("FIM DA LINHA · ラテケ", 320, 120);
        g.fillStyle = "#F4EFE4"; g.font = `600 20px ${MONO}`;
        g.textAlign = "left"; g.fillText("← 塔 TORRE", 18, 176);
        g.textAlign = "right"; g.fillText("門 TORII →", 622, 176);
      };
      draw();
      const { tex, mat } = signMat(c);
      const m = new T.Mesh(new T.PlaneGeometry(3.0, 0.94), mat);
      m.position.set(STATION.x - 5.15, gy + 3.0, STATION.z + 1.16); scene.add(m);
      signRedraws.push(() => { draw(); tex.needsUpdate = true; });
    }
    // quadro de avisos: o que um rodapé teria, pregado na parede
    {
      const c = document.createElement("canvas"); c.width = 600; c.height = 350;
      const draw = () => {
        const g = c.getContext("2d");
        g.fillStyle = "#3A2C22"; g.fillRect(0, 0, 600, 350);
        const pin = (x, y, w, h, rot, bg) => { g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(rot); g.fillStyle = bg; g.fillRect(-w / 2, -h / 2, w, h); g.fillStyle = "#C22026"; g.beginPath(); g.arc(0, -h / 2 + 10, 5, 0, Math.PI * 2); g.fill(); g.restore(); };
        const mail = (document.getElementById("perfilMail") || {}).textContent || "fernando_rateke-n@estudante.sesisenai.org.br";
        pin(22, 20, 330, 150, -0.03, "#F4EFE4");
        g.fillStyle = "#C22026"; g.font = `600 15px ${MONO}`; g.textAlign = "left"; g.textBaseline = "alphabetic";
        g.fillText("連絡 · CONTATO", 42, 60);
        g.fillStyle = "#1C1718"; g.font = `600 28px ${SERIF}`; g.fillText("Fernando Rateke", 42, 98);
        g.font = `500 12.5px ${MONO}`; g.fillText(mail, 42, 130);
        g.fillText("github.com/fernando-rateke", 42, 152);
        pin(372, 26, 200, 140, 0.04, "#EADFC6");
        g.fillStyle = "#C22026"; g.font = `600 15px ${MONO}`; g.fillText("履歴 · CURRÍCULO", 390, 66);
        g.fillStyle = "#1C1718"; g.font = `600 20px ${SERIF}`; g.fillText("LinkedIn", 390, 102); g.fillText("Instagram", 390, 130);
        pin(40, 196, 520, 120, 0.015, "#F4EFE4");
        g.fillStyle = "#1C1718"; g.font = `600 22px ${SERIF}`; g.fillText("A jornada é o que dá forma ao mundo.", 62, 248);
        g.font = `500 13px ${MONO}`; g.fillStyle = "#5A4E44"; g.fillText("© 2026 FERNANDO RATEKE · FEITO À MÃO COM THREE.JS", 62, 284);
      };
      draw();
      const { tex, mat } = signMat(c);
      const m = new T.Mesh(new T.PlaneGeometry(2.8, 1.63), mat);
      m.position.set(STATION.x - 1.6, gy + 1.8, STATION.z - 1.07); scene.add(m);
      signRedraws.push(() => { draw(); tex.needsUpdate = true; });
    }
  }

  // Percurso: uma elipse pelo fundo do vale, sem sumir e reaparecer
  const CASTLE_PATH = { cx: 10, cz: -190, rx: 120, rz: 34, w: 0.0055, a0: 2.3 };
  function castleAt(t) {
    const P = CASTLE_PATH; const a = P.a0 - P.w * t;
    const x = P.cx + P.rx * Math.cos(a), z = P.cz + P.rz * Math.sin(a);
    const dx = P.rx * Math.sin(a), dz = -P.rz * Math.cos(a);
    return { x, z, heading: Math.atan2(-dz, dx) };
  }

  // Fumaça das chaminés
  const SMOKE_N = 98;
  const smoke = (() => {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(new Float32Array(SMOKE_N * 3), 3));
    g.setAttribute("aAge", new T.Float32BufferAttribute(new Float32Array(SMOKE_N), 1));
    const m = new T.ShaderMaterial({
      uniforms: Object.assign({}, U),
      transparent: true, depthWrite: false,
      vertexShader: `attribute float aAge; varying float vAge; void main(){ vAge=aAge; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=(3.0+aAge*13.0)*300.0/-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform float uNight; varying float vAge; void main(){ vec2 p=gl_PointCoord-0.5; float d=length(p); if(d>0.5) discard; float a=smoothstep(0.5,0.12,d)*(1.0-vAge)*0.5; vec3 c=mix(mix(vec3(0.22,0.2,0.21),vec3(0.46,0.45,0.47),vAge),vec3(0.12,0.13,0.17),uNight); gl_FragColor=vec4(c,a); }`,
    });
    const pts = new T.Points(g, m); pts.frustumCulled = false; scene.add(pts);
    return { g, data: Array.from({ length: SMOKE_N }, (_, i) => ({ age: (i * 0.137) % 1, src: i % 7, o: new T.Vector3(), seed: (i * 0.618) % 1 })) };
  })();

  /* ------------------------------------------------------------------ */
  /* Personagens: de costas, no alto da colina, olhando o vale           */
  /* ------------------------------------------------------------------ */
  const HILL = { x: 6, z: 18 };
  const charLine = outlineMat(0.011, "#2A211D");
  const actors = [];
  const SKIN = "#F1D3BE", SKIN_D = "#E2B9A1";
  const lerp = (a, b, t) => a + (b - a) * t;
  // peça com contorno / sem contorno (mechas finas ficariam pesadas com contorno)
  const part = (parent, geo) => { parent.add(new T.Mesh(geo, objMat)); parent.add(new T.Mesh(geo, charLine)); };
  const bare = (parent, geo) => parent.add(new T.Mesh(geo, objMat));
  const one = (geo, color, matrix = M(), sway = 0) => { const b = Builder(); b.add(geo, matrix, color, 0, sway); return b.build(); };
  const joint = (parent, x, y, z) => { const g = new T.Group(); g.position.set(x, y, z); parent.add(g); return g; };

  // Perfil revolucionado; "sub" subdivide o perfil para padrões e dobras mais finos
  const lathe = (pts, segs = 32, phiStart = 0, phiLen = Math.PI * 2, sub = 1) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < sub; k++) {
      const t = k / sub; out.push(new T.Vector2(lerp(pts[i][0], pts[i + 1][0], t), lerp(pts[i][1], pts[i + 1][1], t)));
    }
    const last = pts[pts.length - 1]; out.push(new T.Vector2(last[0], last[1]));
    return new T.LatheGeometry(out, segs, phiStart, phiLen);
  };
  // Pregas de tecido: ondula o raio conforme o ângulo, mais forte perto da barra
  function folds(geo, k, ampAt, seed = 0) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const th = Math.atan2(z, x), a = ampAt(y);
      const f = 1 + a * (Math.sin(th * k + seed) * 0.7 + Math.sin(th * k * 2.3 + seed * 1.7 + y * 6) * 0.3);
      p.setX(i, x * f); p.setZ(i, z * f);
    }
    geo.computeVertexNormals();
    return geo;
  }
  // Mecha de cabelo: tubo achatado e afinado ao longo de uma curva; aT vai de 0 (raiz) a 1 (ponta)
  function lockGeo(points, w0, w1, th, segs = 11, radial = 6) {
    const curve = new T.CatmullRomCurve3(points);
    const fr = curve.computeFrenetFrames(segs, false);
    const pos = [], tt = [], idx = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, c = curve.getPointAt(t), N = fr.normals[i], Bn = fr.binormals[i];
      const w = lerp(w0, w1, Math.pow(t, 1.3)), h = th * (1 - t * 0.75);
      for (let k = 0; k < radial; k++) {
        const a = k / radial * Math.PI * 2, ox = Math.cos(a) * w, oy = Math.sin(a) * h;
        pos.push(c.x + N.x * ox + Bn.x * oy, c.y + N.y * ox + Bn.y * oy, c.z + N.z * ox + Bn.z * oy);
        tt.push(t);
      }
    }
    for (let i = 0; i < segs; i++) for (let k = 0; k < radial; k++) {
      const a = i * radial + k, b = i * radial + (k + 1) % radial, c = a + radial, d = b + radial;
      idx.push(a, b, c, b, d, c);
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setAttribute("aT", new T.Float32BufferAttribute(tt, 1));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  // Penteado: mechas que nascem no alto, contornam o crânio e caem com a ponta solta
  function hairdo(B, o) {
    const r = mulberry(o.seed);
    const [cx, cy, cz] = o.center;
    const groups = o.groups;
    for (const gp of groups) {
      for (let i = 0; i < gp.n; i++) {
        const a = lerp(gp.a[0], gp.a[1], (i + 0.2 + r() * 0.6) / gp.n) * Math.PI;
        const phi0 = lerp(gp.root[0], gp.root[1], r());
        const phiEnd = gp.end + (r() - 0.5) * 0.18;
        const len = lerp(gp.len[0], gp.len[1], r());
        const pts = [];
        for (let k = 0; k <= 4; k++) {
          const ph = lerp(phi0, phiEnd, k / 4);
          const rad = o.R * (1.03 + (o.puff || 0.06) * Math.sin(Math.min(ph, 1.6)) * (k / 4));
          pts.push(new T.Vector3(cx + Math.sin(ph) * Math.cos(a) * rad, cy + Math.cos(ph) * rad, cz + Math.sin(ph) * Math.sin(a) * rad * (o.depth || 1)));
        }
        const last = pts[pts.length - 1].clone();
        const out = new T.Vector3(Math.cos(a), 0, Math.sin(a));
        const flick = gp.out * (0.6 + r() * 0.8);
        pts.push(last.clone().addScaledVector(out, flick * 0.5).add(new T.Vector3(0, -len * 0.55, 0)));
        pts.push(last.clone().addScaledVector(out, flick * (1 - gp.curl)).add(new T.Vector3((r() - 0.5) * 0.02, -len, 0)));
        const g = lockGeo(pts, o.w * (0.75 + r() * 0.5), 0.0025, o.th);
        const shade = i % 5 === 0 ? o.dark : o.base;
        B.add(g, M(), (x, y, z, t) => (t > o.shine[0] && t < o.shine[1] && gp.shine !== false ? o.light : t < 0.05 ? o.dark : shade), 0,
          (j, p, gg) => Math.pow(gg.attributes.aT.getX(j), 1.6) * (gp.sway ?? o.sway));
      }
    }
  }
  // Mão em luva: palma, dedos juntos e polegar
  function hand(B, m, skin = SKIN, side = 1, s = 1) {
    B.add(new T.SphereGeometry(1, 12, 8), m.clone().multiply(M(0, 0, 0, 0, 0, 0, 0.03 * s, 0.038 * s, 0.017 * s)), skin);
    B.add(new T.SphereGeometry(1, 12, 8), m.clone().multiply(M(0, -0.04 * s, 0.002, 0.15, 0, 0, 0.027 * s, 0.032 * s, 0.015 * s)), skin);
    B.add(new T.CapsuleGeometry(0.009 * s, 0.024 * s, 4, 6), m.clone().multiply(M(-side * 0.026 * s, -0.012 * s, -0.008 * s, 0.3, 0, side * 0.6)), skin);
  }
  // Orelha
  const ear = (B, x, y, z, s = 1) => B.add(new T.SphereGeometry(1, 10, 8), M(x, y, z, 0, 0, 0, 0.016 * s, 0.032 * s, 0.022 * s), SKIN_D);

  // Tronco de gente não é redondo: achata frente e costas e alarga os ombros
  function ovalize(geo, fn) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); const [sx, sz] = fn(y); p.setX(i, p.getX(i) * sx); p.setZ(i, p.getZ(i) * sz); }
    geo.computeVertexNormals(); return geo;
  }
  const bump = (y, c, w) => Math.exp(-((y - c) / w) * ((y - c) / w));
  // Cabelo como uma massa só: cobre o crânio inteiro e cai em mechas recortadas
  function hairShell(B, o) {
    const [cx, cy, cz] = o.center, R = o.R, SU = 72, SV = 22;
    const pos = [], vv = [], idx = [];
    const lenAt = (th) => {
      const back = (1 + Math.sin(th)) / 2;              // 0 na testa (−z), 1 na nuca (+z)
      const side = Math.abs(Math.cos(th));
      let L = o.front + (o.back - o.front) * Math.pow(back, 1.4) + o.side * side * (1 - back) * 0.9;
      const w = Math.abs(Math.sin(th * o.locks * 0.5 + o.seed));
      return L * (1 + o.spike * Math.pow(w, 2.2));
    };
    for (let i = 0; i <= SU; i++) {
      const th = i / SU * Math.PI * 2, drape = lenAt(th) * R, arc = R * Math.PI / 2, A = arc + drape;
      for (let j = 0; j <= SV; j++) {
        const d = j / SV * A; let x, y, z;
        const groove = 1 + 0.035 * Math.sin(th * o.locks) * Math.min(1, d / arc);
        if (d <= arc) { const ph = d / R, rr = R * o.puff * groove * (1 + 0.05 * Math.sin(ph)); x = Math.sin(ph) * Math.cos(th) * rr; y = Math.cos(ph) * R * o.puffY; z = Math.sin(ph) * Math.sin(th) * rr * o.depth; }
        else { const k = (d - arc) / Math.max(drape, 1e-4), rr = R * o.puff * groove * (1 - o.tipIn * k * k) * (1 - 0.06 * k); x = Math.cos(th) * rr; y = -(d - arc); z = Math.sin(th) * rr * o.depth; }
        pos.push(cx + x, cy + y, cz + z); vv.push(d / A);
      }
    }
    for (let i = 0; i < SU; i++) for (let j = 0; j < SV; j++) { const a = i * (SV + 1) + j, b = a + SV + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("aT", new T.Float32BufferAttribute(vv, 1)); g.setIndex(idx); g.computeVertexNormals();
    B.add(g, M(), (x, y, z, t) => {
      const th = Math.atan2(z - cz, x - cx), lock = Math.floor((th + Math.PI) / (Math.PI * 2) * o.locks);
      if (t > o.shine[0] && t < o.shine[1] && Math.sin(th * 3.0 + 1.2) > -0.2) return o.light;
      return lock % 3 === 0 ? o.dark : o.base;
    }, 0, (j, p, gg) => Math.pow(Math.max(0, gg.attributes.aT.getX(j) - 0.45) / 0.55, 1.5) * o.sway);
  }

  /* Howl: casaco em losangos, cabelo loiro repicado */
  {
    const g = new T.Group();
    const PINK = "#EAA1B9", BLUE = "#98C3E0", GOLD = "#D9B45E", SEAM = "#7C6A86";
    const HAIR = "#EDCB70", HAIR_D = "#C79E48", HAIR_L = "#FBEAB0", PANTS = "#2C2A35", BOOT = "#3A2A22";
    const harlequin = (x, y, z) => {
      const th = Math.atan2(z, x);
      const u = th / (Math.PI * 2) * 14, v = y * 9;
      return (Math.floor(u + v) + Math.floor(u - v)) & 1 ? PINK : BLUE;
    };
    const legsH = [-1, 1].map((sx) => {
      const hip = joint(g, sx * 0.088, 0.93, 0);
      const b = Builder();
      b.add(folds(lathe([[0.062, -0.82], [0.068, -0.55], [0.072, -0.3], [0.075, -0.05], [0.07, 0.04]], 16, 0, Math.PI * 2, 3), 5, (y) => 0.05), M(), PANTS);
      b.add(new T.CapsuleGeometry(0.07, 0.12, 4, 12), M(0, -0.86, -0.035, -Math.PI / 2, 0, 0), BOOT);
      b.add(new T.CylinderGeometry(0.074, 0.074, 0.03, 14), M(0, -0.9, 0.04), "#241A15");
      part(hip, b.build()); return hip;
    });
    const torso = new T.Group(); g.add(torso);
    const tb = Builder();
    // quadril e cintura da calça
    tb.add(ovalize(lathe([[0.15, 0.86], [0.158, 0.93], [0.15, 1.0]], 32), () => [1.05, 0.78]), M(), PANTS);
    // jaqueta curta até o quadril, ombros largos, costas retas
    const coat = ovalize(folds(lathe([[0.205, 0.8], [0.19, 0.9], [0.172, 1.0], [0.176, 1.12], [0.192, 1.25], [0.205, 1.36], [0.19, 1.43], [0.13, 1.5], [0.07, 1.545]], 64, 0, Math.PI * 2, 6),
      9, (y) => 0.03 * smooth(1.05, 0.8, y), 0.7), (y) => [1 + 0.16 * bump(y, 1.38, 0.09), 0.74 + 0.04 * smooth(1.1, 0.85, y)]);
    tb.add(coat, M(), harlequin, 0, (j, p) => smooth(0.95, 0.8, p.getY(j)) * 0.8);
    tb.add(ovalize(new T.TorusGeometry(0.2, 0.012, 6, 48), () => [1, 1]), M(0, 0.81, 0, Math.PI / 2, 0, 0, 1, 0.75, 1), GOLD, 0, 0.8);
    // costura central das costas
    tb.add(new T.BoxGeometry(0.01, 0.5, 0.006), M(0, 1.08, 0.132), SEAM);
    // omoplatas e deltoides dão forma de gente às costas
    for (const sx of [-1, 1]) { tb.add(new T.SphereGeometry(1, 16, 12), M(sx * 0.08, 1.3, 0.118, 0, 0, 0, 0.085, 0.1, 0.02), harlequin); tb.add(new T.SphereGeometry(1, 14, 10), M(sx * 0.215, 1.39, 0, 0, 0, 0, 0.07, 0.065, 0.075), harlequin); }
    // gola alta
    tb.add(lathe([[0.075, 1.5], [0.088, 1.56], [0.095, 1.6]], 28), M(), "#4F6E96");
    tb.add(new T.TorusGeometry(0.072, 0.02, 8, 20), M(0, 1.53, 0, Math.PI / 2, 0, 0), "#F4F0E6");
    // bolso onde a mão direita se esconde
    tb.add(new T.BoxGeometry(0.11, 0.07, 0.03), M(0.2, 0.86, -0.06, 0, -0.6, -0.15), PINK);
    part(torso, tb.build());
    const armsH = [-1, 1].map((sx) => {
      const sh = joint(torso, sx * 0.232, 1.39, 0);
      const b = Builder();
      b.add(folds(lathe([[0.045, -0.54], [0.052, -0.42], [0.056, -0.27], [0.062, -0.12], [0.064, 0.0], [0.05, 0.05]], 20, 0, Math.PI * 2, 3), 6, (y) => 0.05), M(), harlequin);
      b.add(new T.TorusGeometry(0.052, 0.012, 6, 18), M(0, -0.5, 0, Math.PI / 2, 0, 0), GOLD);
      if (sx < 0) hand(b, M(0, -0.56, 0), SKIN, sx);
      part(sh, b.build()); return sh;
    });
    const head = joint(torso, 0, 1.58, 0);
    const hb = Builder();
    hb.add(new T.CylinderGeometry(0.044, 0.05, 0.12, 12), M(0, -0.02, 0), SKIN);
    hb.add(new T.SphereGeometry(0.11, 22, 16), M(0, 0.125, 0, 0, 0, 0, 0.96, 1.1, 1.02), SKIN);
    ear(hb, -0.103, 0.11, 0.0); ear(hb, 0.103, 0.11, 0.0);
    part(head, hb.build());
    const hair = Builder();
    hairShell(hair, { center: [0, 0.135, 0.004], R: 0.118, puff: 1.1, puffY: 1.12, depth: 1.06, front: 0.12, side: 0.55, back: 0.8, locks: 12, spike: 0.55, tipIn: 0.05, seed: 0.4,
      base: HAIR, dark: HAIR_D, light: HAIR_L, shine: [0.18, 0.3], sway: 0.9 });
    part(head, hair.build());
    // mechas repicadas por cima da massa, soltas na nuca e nas laterais
    const flicks = Builder();
    hairdo(flicks, {
      seed: 8, center: [0, 0.135, 0.004], R: 0.128, w: 0.03, th: 0.012, sway: 1.0, puff: 0.08, depth: 1.06,
      base: HAIR, dark: HAIR_D, light: HAIR_L, shine: [0.1, 0.22],
      groups: [
        { n: 16, a: [0.05, 0.95], root: [0.7, 1.15], end: 1.95, len: [0.05, 0.1], out: 0.045, curl: 0.15 },
        { n: 6, a: [-0.1, 0.1], root: [0.8, 1.2], end: 1.8, len: [0.04, 0.08], out: 0.04, curl: 0.2 },
        { n: 6, a: [0.9, 1.1], root: [0.8, 1.2], end: 1.8, len: [0.04, 0.08], out: 0.04, curl: 0.2 },
      ],
    });
    bare(head, flicks.build());
    g.position.set(HILL.x + 0.62, 0, HILL.z - 0.1);
    g.rotation.y = 0.08;
    scene.add(g);
    actors.push((t) => {
      g.position.y = heightAt(g.position.x, g.position.z) - 0.04;
      torso.scale.y = 1 + Math.sin(t * 1.3) * 0.006;
      armsH[1].rotation.set(-0.3, -0.2, 0.2);                 // mão direita no bolso
      armsH[0].rotation.set(Math.sin(t * 0.9) * 0.05, 0, -0.06 - Math.sin(t * 0.7) * 0.03);
      head.rotation.y = Math.sin(t * 0.21) * 0.18 + 0.14 * smooth(0.6, 1, Math.sin(t * 0.13 + 2));
      head.rotation.x = -0.05 + Math.sin(t * 0.3) * 0.03;
      legsH[0].rotation.z = 0.02; legsH[1].rotation.z = -0.03;
    });
  }

  /* Sofia: chanel prateado, vestido azul com pregas, gola e laço do avental */
  {
    const g = new T.Group();
    const DRESS = "#5D7FB4", DRESS_D = "#4B6A9C", HAIR = "#E9ECF1", HAIR_D = "#BDC5D1", HAIR_L = "#FFFFFF", WHITE = "#F4F1E8";
    const lb = Builder();
    for (const sx of [-1, 1]) {
      lb.add(new T.CapsuleGeometry(0.036, 0.1, 4, 8), M(sx * 0.07, 0.11, 0), "#6B5545");
      lb.add(new T.CapsuleGeometry(0.046, 0.08, 4, 10), M(sx * 0.07, 0.04, -0.035, -Math.PI / 2, 0, 0), "#4A3426");
    }
    part(g, lb.build());
    const torso = new T.Group(); g.add(torso);
    const tb = Builder();
    const dress = ovalize(folds(lathe([[0.27, 0.12], [0.25, 0.3], [0.215, 0.55], [0.165, 0.8], [0.118, 0.96], [0.122, 1.03], [0.142, 1.12], [0.155, 1.2], [0.16, 1.25], [0.12, 1.3], [0.05, 1.33]], 56, 0, Math.PI * 2, 5),
      14, (y) => 0.06 * smooth(0.95, 0.12, y), 1.3), (y) => [1 + 0.14 * bump(y, 1.24, 0.07), 0.9 - 0.16 * smooth(0.9, 1.1, y)]);
    tb.add(dress, M(), (x, y) => (y < 0.18 ? DRESS_D : DRESS), 0, (j, p) => smooth(0.85, 0.12, p.getY(j)) * 1.1);
    // omoplatas e mangas bufantes
    for (const sx of [-1, 1]) { tb.add(new T.SphereGeometry(1, 14, 10), M(sx * 0.062, 1.17, 0.1, 0, 0, 0, 0.065, 0.08, 0.016), DRESS); tb.add(new T.SphereGeometry(1, 14, 10), M(sx * 0.185, 1.22, 0, 0, 0, 0, 0.066, 0.058, 0.066), DRESS); }
    tb.add(new T.TorusGeometry(0.075, 0.026, 8, 20), M(0, 1.31, 0, Math.PI / 2, 0, 0), WHITE);
    // alças do avental cruzando as costas, laço e fitas
    tb.add(new T.BoxGeometry(0.022, 0.32, 0.008), M(-0.045, 1.13, 0.132, -0.12, 0, 0.32), WHITE);
    tb.add(new T.BoxGeometry(0.022, 0.32, 0.008), M(0.045, 1.13, 0.132, -0.12, 0, -0.32), WHITE);
    tb.add(new T.TorusGeometry(0.124, 0.013, 6, 32), M(0, 0.975, 0, Math.PI / 2, 0, 0), WHITE);
    tb.add(new T.SphereGeometry(1, 12, 8), M(-0.068, 0.985, 0.128, 0, 0.3, 0.45, 0.064, 0.036, 0.022), WHITE);
    tb.add(new T.SphereGeometry(1, 12, 8), M(0.068, 0.985, 0.128, 0, -0.3, -0.45, 0.064, 0.036, 0.022), WHITE);
    tb.add(new T.SphereGeometry(0.02, 8, 6), M(0, 0.98, 0.135), WHITE);
    tb.add(new T.BoxGeometry(0.022, 0.24, 0.008), M(-0.03, 0.86, 0.13, 0, 0, 0.16), WHITE, 0, 1.0);
    tb.add(new T.BoxGeometry(0.022, 0.26, 0.008), M(0.035, 0.85, 0.13, 0, 0, -0.12), WHITE, 0, 1.0);
    part(torso, tb.build());
    const armsS = [-1, 1].map((sx) => {
      const sh = joint(torso, sx * 0.19, 1.21, 0);
      const b = Builder();
      b.add(folds(lathe([[0.04, -0.44], [0.047, -0.3], [0.05, -0.1], [0.05, 0.02]], 18, 0, Math.PI * 2, 3), 5, (y) => 0.06), M(), DRESS);
      b.add(new T.TorusGeometry(0.042, 0.01, 6, 16), M(0, -0.44, 0, Math.PI / 2, 0, 0), WHITE);
      hand(b, M(0, -0.49, 0), SKIN, sx, 0.9);
      part(sh, b.build()); return sh;
    });
    const head = joint(torso, 0, 1.36, 0);
    const hb = Builder();
    hb.add(new T.CylinderGeometry(0.037, 0.042, 0.08, 12), M(0, -0.01, 0), SKIN);
    hb.add(new T.SphereGeometry(0.098, 22, 16), M(0, 0.105, 0, 0, 0, 0, 0.96, 1.08, 1.02), SKIN);
    ear(hb, -0.093, 0.095, 0.0, 0.85); ear(hb, 0.093, 0.095, 0.0, 0.85);
    part(head, hb.build());
    const hair = Builder();
    hairShell(hair, { center: [0, 0.118, 0.004], R: 0.104, puff: 1.16, puffY: 1.1, depth: 1.08, front: 0.1, side: 0.95, back: 1.0, locks: 22, spike: 0.06, tipIn: 0.32, seed: 1.1,
      base: HAIR, dark: HAIR_D, light: HAIR_L, shine: [0.16, 0.28], sway: 0.6 });
    part(head, hair.build());
    g.position.set(HILL.x - 0.02, 0, HILL.z + 0.05);
    g.rotation.y = -0.06;
    scene.add(g);
    actors.push((t) => {
      g.position.y = heightAt(g.position.x, g.position.z) - 0.03;
      torso.scale.y = 1 + Math.sin(t * 1.5 + 1) * 0.006;
      const look = smooth(0.55, 0.9, Math.sin(t * 0.16));
      head.rotation.y = -0.45 * look + Math.sin(t * 0.4) * 0.04;
      head.rotation.z = -0.08 * look;
      armsS[1].rotation.set(-0.12, 0, 0.42);                  // de braço dado com o Howl
      const gustK = smooth(0.4, 0.9, Math.sin(t * 0.55));     // segura o cabelo quando o vento aperta
      armsS[0].rotation.set(-0.2 * gustK, 0, -0.08 - 2.4 * gustK);
    });
  }

  /* Markl: corre em volta dos dois */
  {
    const g = new T.Group();
    const SHIRT = "#7FA9D2", VEST = "#5E7F57", SHORTS = "#6B4A33", HAIR = "#8A5A3A", HAIR_D = "#6E4429", HAIR_L = "#B07E57";
    const body = new T.Group(); g.add(body);
    const legsM = [-1, 1].map((sx) => {
      const hip = joint(body, sx * 0.055, 0.42, 0);
      const b = Builder();
      b.add(new T.CapsuleGeometry(0.034, 0.26, 4, 10), M(0, -0.19, 0), SKIN);
      b.add(new T.CapsuleGeometry(0.044, 0.07, 4, 10), M(0, -0.38, -0.03, -Math.PI / 2, 0, 0), "#5B3B2A");
      b.add(new T.CylinderGeometry(0.04, 0.038, 0.06, 10), M(0, -0.33, 0), "#EDE6D6");
      part(hip, b.build()); return hip;
    });
    const tb = Builder();
    tb.add(folds(lathe([[0.1, 0.36], [0.098, 0.44], [0.092, 0.5]], 20, 0, Math.PI * 2, 2), 6, () => 0.08), M(), SHORTS);
    tb.add(folds(lathe([[0.13, 0.46], [0.12, 0.56], [0.1, 0.7], [0.11, 0.76], [0.05, 0.8]], 36, 0, Math.PI * 2, 3), 9, (y) => 0.06 * smooth(0.62, 0.46, y)), M(), SHIRT, 0, (j, p) => smooth(0.6, 0.46, p.getY(j)) * 0.8);
    tb.add(lathe([[0.112, 0.58], [0.104, 0.68], [0.112, 0.75]], 30, Math.PI * 0.15, Math.PI * 1.7), M(0, 0, 0, 0, 0, 0, 1.03, 1, 1.05), VEST);
    tb.add(new T.TorusGeometry(0.106, 0.012, 6, 26), M(0, 0.5, 0, Math.PI / 2, 0, 0), "#4A3426");
    part(body, tb.build());
    const armsM = [-1, 1].map((sx) => {
      const sh = joint(body, sx * 0.12, 0.74, 0);
      const b = Builder();
      b.add(new T.CapsuleGeometry(0.031, 0.2, 4, 10), M(0, -0.13, 0), SHIRT);
      hand(b, M(0, -0.27, 0), SKIN, sx, 0.75);
      part(sh, b.build()); return sh;
    });
    const head = joint(body, 0, 0.8, 0);
    const hb = Builder();
    hb.add(new T.SphereGeometry(0.1, 20, 14), M(0, 0.1, 0), SKIN);
    ear(hb, -0.097, 0.09, 0.0, 0.8); ear(hb, 0.097, 0.09, 0.0, 0.8);
    hb.add(new T.SphereGeometry(0.104, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), M(0, 0.112, 0.006, 0, 0, 0, 1.0, 1.04, 1.06), HAIR_D);
    part(head, hb.build());
    const hair = Builder();
    hairdo(hair, {
      seed: 22, center: [0, 0.112, 0.006], R: 0.104, w: 0.03, th: 0.014, sway: 0.5, puff: 0.18,
      base: HAIR, dark: HAIR_D, light: HAIR_L, shine: [0.2, 0.3],
      groups: [
        { n: 26, a: [-0.1, 1.1], root: [0.04, 0.5], end: 1.42, len: [0.01, 0.04], out: 0.035, curl: -0.6 },   // desarrumado, pontas para fora
        { n: 8, a: [1.2, 1.8], root: [0.04, 0.3], end: 1.0, len: [0.01, 0.03], out: 0.02, curl: 0, shine: false },
      ],
    });
    bare(head, hair.build());
    scene.add(g);
    actors.push((t) => {
      const a = t * 0.9;
      const cx = HILL.x - 1.2, cz = HILL.z - 2.0;
      const x = cx + Math.cos(a) * 2.6, z = cz + Math.sin(a) * 1.1;
      const dx = -Math.sin(a) * 2.6, dz = Math.cos(a) * 1.1;
      g.position.set(x, heightAt(x, z) - 0.02, z);
      g.rotation.y = Math.atan2(-dx, -dz);
      const run = t * 10.5;
      body.position.y = Math.abs(Math.sin(run)) * 0.06;
      body.rotation.x = -0.18;
      legsM[0].rotation.x = Math.sin(run) * 0.85; legsM[1].rotation.x = -Math.sin(run) * 0.85;
      armsM[0].rotation.x = -Math.sin(run) * 0.75; armsM[1].rotation.x = Math.sin(run) * 0.75;
      armsM[0].rotation.z = -0.25; armsM[1].rotation.z = 0.25;
      head.rotation.x = 0.12;
    });
  }

  /* Cabeça de Nabo: espantalho em cruz, casaco pendurado na vara, pulando na estaca */
  {
    const g = new T.Group();
    const COAT = "#45403B", COAT_D = "#34302C", COAT_L = "#5E564C", STICK = "#8A6A44", STICK_D = "#6E5233";
    const STRAW = "#DDBD62", STRAW_D = "#B8953F", SCARF = "#8C3B33";
    const body = new T.Group(); g.add(body);
    const rr = mulberry(61);
    const b = Builder();
    // estaca única (a "perna") que sobe até a cabeça
    b.add(new T.CylinderGeometry(0.028, 0.016, 1.62, 8), M(0, 0.81, 0), STICK);
    b.add(new T.ConeGeometry(0.016, 0.06, 6), M(0, -0.02, 0, Math.PI, 0, 0), STICK_D);
    // vara dos ombros atravessada
    b.add(new T.CylinderGeometry(0.02, 0.02, 1.56, 8), M(0, 1.39, 0, 0, 0, Math.PI / 2), STICK);
    // casaco pendurado: ombros retos, corpo achatado, barra larga
    const coat = folds(lathe([[0.24, 0.8], [0.225, 0.92], [0.205, 1.08], [0.21, 1.24], [0.235, 1.36], [0.24, 1.4], [0.15, 1.44], [0.06, 1.46]], 40, 0, Math.PI * 2, 4),
      7, (y) => 0.07 * smooth(1.2, 0.8, y), 2.1);
    b.add(coat, M(0, 0, 0, 0, 0, 0, 1, 1, 0.5), (x, y, z) => (Math.abs(x) < 0.012 && z > 0 ? COAT_D : (y < 0.95 && ((x * 13 | 0) & 1) ? COAT_D : COAT)), 0,
      (j, p) => smooth(1.15, 0.8, p.getY(j)) * 1.5);
    // remendos costurados e cinto de corda
    [[-0.11, 1.2, "#6E5A44"], [0.09, 1.05, "#4E5A4E"], [0.13, 1.28, "#7A4E3E"], [-0.07, 0.93, "#5C5A6E"]].forEach(([x, y, c]) => {
      b.add(new T.BoxGeometry(0.075, 0.065, 0.01), M(x, y, 0.118, 0, 0, (rr() - 0.5) * 0.4), c);
    });
    b.add(new T.TorusGeometry(0.21, 0.012, 6, 30), M(0, 1.02, 0, Math.PI / 2, 0, 0, 1, 0.52, 1), "#B59C6B");
    b.add(new T.CylinderGeometry(0.008, 0.008, 0.16, 5), M(0.06, 0.94, 0.11, 0, 0, 0.2), "#B59C6B", 0, 1.2);
    // barra em farrapos: tiras de comprimentos diferentes
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * Math.PI * 2 + rr() * 0.2;
      const len = 0.08 + rr() * 0.2;
      b.add(new T.BoxGeometry(0.045 + rr() * 0.03, len, 0.01), M(Math.cos(a) * 0.235, 0.8 - len / 2 + 0.03, Math.sin(a) * 0.12, 0, -a + Math.PI / 2, (rr() - 0.5) * 0.25),
        i % 3 ? COAT : COAT_L, 0, (j, p) => smooth(len / 2, -len / 2, p.getY(j)) * 2.2);
    }
    // mangas largas caindo ao longo da vara, com pontas rasgadas e palha saindo
    for (const sx of [-1, 1]) {
      const sleeve = folds(lathe([[0.075, 0.0], [0.07, 0.15], [0.078, 0.32], [0.09, 0.46]], 18, 0, Math.PI * 2, 3), 5, () => 0.08, sx);
      b.add(sleeve, M(sx * 0.2, 1.37, 0, 0, 0, -sx * Math.PI / 2 + sx * 0.05), COAT, 0, (j, p) => smooth(0.1, 0.46, p.getY(j)) * 1.4);
      for (let k = 0; k < 7; k++) {
        const len = 0.06 + rr() * 0.12, a = k / 7 * Math.PI * 2;
        b.add(new T.BoxGeometry(0.03, len, 0.008), M(sx * (0.66 + rr() * 0.02), 1.37 - len / 2 + Math.sin(a) * 0.06, Math.cos(a) * 0.06, 0, Math.PI / 2, 0), COAT_L, 0, 2.0);
      }
      for (let k = 0; k < 14; k++) {
        const up = (rr() - 0.5) * 1.6;
        b.add(new T.ConeGeometry(0.007, 0.12 + rr() * 0.08, 4), M(sx * (0.7 + rr() * 0.04), 1.37 + up * 0.03, (rr() - 0.5) * 0.08, (rr() - 0.5) * 0.6, 0, -sx * (Math.PI / 2 - up * 0.5)),
          k % 2 ? STRAW : STRAW_D, 0, 1.3);
      }
      // mão de graveto bifurcado
      b.add(new T.CylinderGeometry(0.009, 0.004, 0.13, 5), M(sx * 0.82, 1.4, 0, 0, 0, -sx * 1.3), STICK_D);
      b.add(new T.CylinderGeometry(0.006, 0.003, 0.08, 5), M(sx * 0.84, 1.36, 0.01, 0, 0, -sx * 2.1), STICK_D);
    }
    // gola, lenço e palha no pescoço
    b.add(new T.TorusGeometry(0.075, 0.03, 8, 18), M(0, 1.47, 0, Math.PI / 2, 0, 0), SCARF);
    b.add(new T.BoxGeometry(0.05, 0.16, 0.012), M(0.03, 1.38, 0.08, 0.15, 0, -0.25), SCARF, 0, 1.4);
    b.add(new T.BoxGeometry(0.045, 0.13, 0.012), M(-0.02, 1.39, 0.085, 0.15, 0, 0.3), SCARF, 0, 1.4);
    for (let k = 0; k < 9; k++) b.add(new T.ConeGeometry(0.007, 0.1, 4), M((rr() - 0.5) * 0.08, 1.52, (rr() - 0.5) * 0.06, (rr() - 0.5) * 0.9, 0, (rr() - 0.5) * 0.9), STRAW, 0, 0.8);
    // nabo: bulbo branco, topo roxo e a raiz pontuda
    const TW = new T.Color("#F4F0E7"), TP = new T.Color("#9E4479"), TMID = new T.Color("#D58CB2");
    const turnip = (x, y) => {
      const k = smooth(0.12, 0.3, y);
      return k < 0.5 ? new T.Color().lerpColors(TW, TMID, k * 2) : new T.Color().lerpColors(TMID, TP, (k - 0.5) * 2);
    };
    b.add(lathe([[0.0, -0.06], [0.03, 0.0], [0.11, 0.05], [0.172, 0.13], [0.18, 0.2], [0.15, 0.28], [0.08, 0.33], [0.02, 0.35]], 32, 0, Math.PI * 2, 3), M(0, 1.6, 0), turnip);
    b.add(new T.ConeGeometry(0.012, 0.12, 6), M(0, 1.5, 0, Math.PI, 0, 0), "#E8E2D4");
    // cartola alta, um pouco torta
    const hatM = M(0.02, 1.93, 0, 0.08, 0, -0.12);
    b.add(new T.CylinderGeometry(0.108, 0.115, 0.28, 24), hatM.clone().multiply(M(0, 0.15, 0)), "#1E1B1C");
    b.add(new T.CylinderGeometry(0.19, 0.19, 0.016, 28), hatM, "#1E1B1C");
    b.add(new T.CylinderGeometry(0.117, 0.117, 0.04, 24), hatM.clone().multiply(M(0, 0.04, 0)), "#6B2E3A");
    part(body, b.build());
    g.position.set(HILL.x + 3.3, 0, HILL.z - 1.6);
    g.rotation.y = 0.12;
    scene.add(g);
    actors.push((t) => {
      const ph = t * 3.0;
      const hop = Math.abs(Math.sin(ph));
      const land = Math.pow(1 - hop, 6);                       // tranco ao tocar o chão
      g.position.y = heightAt(g.position.x, g.position.z) - 0.05 + hop * 0.32;
      body.scale.set(1 + land * 0.04, 1 - land * 0.06, 1);
      body.rotation.z = Math.sin(ph) * 0.06;
      body.rotation.x = -land * 0.05;
      g.rotation.y = 0.12 + Math.sin(t * 0.37) * 0.16;
    });
  }

  /* Heen: o cachorro velho, ofegante, ao lado da Sofia */
  {
    const g = new T.Group();
    const FUR = "#D3BB92", FUR_D = "#A88B63", FUR_L = "#EBDCC0";
    const body = new T.Group(); g.add(body);
    const b = Builder();
    b.add(folds(lathe([[0.0, -0.2], [0.07, -0.19], [0.11, -0.12], [0.12, 0.0], [0.115, 0.12], [0.08, 0.19], [0.0, 0.21]], 26, 0, Math.PI * 2, 2), 7, () => 0.03), M(0, 0.2, 0, Math.PI / 2, 0, 0, 1, 1, 0.92), FUR);
    b.add(new T.SphereGeometry(0.1, 16, 10), M(0, 0.15, -0.02, 0, 0, 0, 1.05, 0.62, 1.6), FUR_L);
    part(body, b.build());
    const legsH = [[-0.07, -0.13], [0.07, -0.13], [-0.075, 0.14], [0.075, 0.14]].map(([x, z]) => {
      const j = joint(body, x, 0.12, z);
      const lb = Builder();
      lb.add(new T.CapsuleGeometry(0.032, 0.06, 4, 10), M(0, -0.05, 0), FUR);
      lb.add(new T.SphereGeometry(1, 10, 8), M(0, -0.1, -0.015, 0, 0, 0, 0.04, 0.022, 0.05), FUR_L);
      part(j, lb.build());
      return j;
    });
    const head = joint(body, 0, 0.29, -0.23);
    const hb = Builder();
    hb.add(new T.SphereGeometry(0.088, 18, 12), M(0, 0, 0, 0, 0, 0, 1, 0.95, 1.05), FUR);
    hb.add(new T.CapsuleGeometry(0.046, 0.07, 4, 12), M(0, -0.03, -0.09, -Math.PI / 2, 0, 0), FUR_L);
    for (const sx of [-1, 1]) hb.add(new T.SphereGeometry(1, 10, 8), M(sx * 0.03, -0.065, -0.1, 0, 0, 0, 0.03, 0.03, 0.04), FUR_L);  // papada
    hb.add(new T.SphereGeometry(0.022, 8, 6), M(0, -0.022, -0.155), "#2A201D");
    for (let k = 0; k < 6; k++) hb.add(new T.ConeGeometry(0.012, 0.04, 4), M((k - 2.5) * 0.018, 0.08, 0.01, -0.3, 0, (k - 2.5) * 0.2), FUR_D, 0, 0.4);
    part(head, hb.build());
    const ears = [-1, 1].map((sx) => {
      const e = joint(head, sx * 0.08, 0.02, 0.01);
      part(e, one(new T.SphereGeometry(1, 12, 10), FUR_D, M(sx * 0.012, -0.075, 0, 0, 0, sx * 0.12, 0.022, 0.105, 0.058), 0.6));
      return e;
    });
    const tail = joint(body, 0, 0.26, 0.26);
    part(tail, one(new T.ConeGeometry(0.024, 0.17, 8), FUR, M(0, 0.075, 0.02, 0.5, 0, 0)));
    g.scale.setScalar(1.5);
    scene.add(g);
    // passeia num oito na frente do grupo: anda, para, fareja, segue
    const ease3 = (k) => k * k * (3 - 2 * k);
    const pathAt = (a) => ({ x: HILL.x - 2.3 + Math.sin(a) * 1.5, z: HILL.z + 0.9 + Math.sin(a * 2) * 0.45 });
    actors.push((t) => {
      const u = t * 0.16, seg = Math.floor(u), fr = u - seg;
      const mv = fr < 0.68 ? ease3(fr / 0.68) : 1;
      const walking = fr > 0.03 && fr < 0.65;
      const a = (seg + mv) * 1.5;
      const p = pathAt(a), q = pathAt(a + 0.02);
      g.position.set(p.x, heightAt(p.x, p.z) - 0.02, p.z);
      g.rotation.y = Math.atan2(-(q.x - p.x), -(q.z - p.z));
      const step = t * 9.5;
      legsH.forEach((l, i) => { l.rotation.x = walking ? Math.sin(step + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.55 : 0; });
      body.position.y = walking ? Math.abs(Math.sin(step)) * 0.012 : 0;
      body.rotation.z = walking ? Math.sin(step) * 0.05 : 0;
      const pant = Math.sin(t * 9.0);
      body.scale.set(1 + pant * 0.025, 1 + pant * 0.03, 1);
      const sniff = !walking && fr > 0.72;
      head.rotation.x = sniff ? 0.55 + Math.sin(t * 14) * 0.05 : 0.05 + pant * 0.04;
      head.rotation.y = walking ? Math.sin(t * 1.3) * 0.15 : Math.sin(t * 0.5) * 0.45;
      ears.forEach((e, i) => { e.rotation.z = (i ? -1 : 1) * (0.05 + Math.sin(t * 2.2 + i) * 0.08); e.rotation.x = Math.sin(t * 1.7 + i) * 0.1; });
      tail.rotation.z = Math.sin(t * (walking ? 9 : 6)) * (sniff ? 0.9 : 0.6);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Grama com vento                                                     */
  /* ------------------------------------------------------------------ */
  const WIND = `
    uniform vec2 uWind; uniform float uTime; uniform float uGustAmp;
    float gust(vec2 xz){
      float travel=dot(xz,uWind);
      float wave=sin(travel*0.16-uTime*1.9)*0.5+0.5;
      float n=snoise(xz*0.035-uWind*uTime*0.55)*0.5+0.5;
      return smoothstep(0.25,0.95,wave*0.55+n*0.65)*uGustAmp;
    }`;
  let grass, flowers;
  {
    const COUNT = reduce ? 30000 : (small ? 60000 : 170000);
    const blade = new T.BufferGeometry();
    const by = [0, 0, 0.3, 0.3, 0.62, 0.62, 1.0], bx = [-1, 1, -0.85, 0.85, -0.55, 0.55, 0];
    const bp = [];
    for (let i = 0; i < 7; i++) bp.push(bx[i], by[i], 0);
    blade.setAttribute("position", new T.Float32BufferAttribute(bp, 3));
    blade.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 4, 5, 6]);
    const ig = new T.InstancedBufferGeometry();
    ig.setIndex(blade.index); ig.setAttribute("position", blade.getAttribute("position"));
    const off = new Float32Array(COUNT * 3), sc = new Float32Array(COUNT * 2), rot = new Float32Array(COUNT), tone = new Float32Array(COUNT);
    const r = mulberry(9); let n = 0, tries = 0;
    while (n < COUNT && tries < COUNT * 6) {
      tries++;
      const z = 21 - Math.pow(r(), 1.5) * 58;
      const spread = 26 + (21 - z) * 1.0;
      const x = (r() * 2 - 1) * spread;
      const y = heightAt(x, z);
      if (y < 0.42) continue;
      const d = Math.hypot(x, z - 22);
      if (r() > 1.4 / (1 + d * 0.025)) continue;
      off[n * 3] = x; off[n * 3 + 1] = y - 0.02; off[n * 3 + 2] = z;
      const far = Math.min(1, d / 60);
      sc[n * 2] = 0.045 + r() * 0.035 + far * 0.07; sc[n * 2 + 1] = 0.22 + r() * 0.36 + far * 0.12;
      rot[n] = r() * Math.PI; tone[n] = r();
      n++;
    }
    ig.instanceCount = n; ig.userData.full = n;
    ig.setAttribute("aOff", new T.InstancedBufferAttribute(off, 3));
    ig.setAttribute("aSc", new T.InstancedBufferAttribute(sc, 2));
    ig.setAttribute("aRot", new T.InstancedBufferAttribute(rot, 1));
    ig.setAttribute("aTone", new T.InstancedBufferAttribute(tone, 1));
    const m = new T.ShaderMaterial({
      uniforms: Object.assign({}, U, { uBase: { value: col("#3F7038") }, uTip: { value: col("#9CCB62") }, uSheen: { value: col("#D7E58E") }, uDry: { value: col("#B8B865") } }),
      side: T.DoubleSide,
      vertexShader: `${NOISE}${WIND}
        attribute vec3 aOff; attribute vec2 aSc; attribute float aRot; attribute float aTone;
        varying float vT; varying float vG; varying float vTone; varying vec3 vW;
        void main(){
          float t=position.y;
          vec3 p=vec3(position.x*aSc.x*(1.0-t*0.2), t*aSc.y, 0.0);
          float c=cos(aRot), s=sin(aRot);
          p=vec3(p.x*c, p.y, p.x*s);
          float g=gust(aOff.xz);
          float flutter=sin(uTime*5.0+aRot*12.0+aOff.x)*0.04;
          float bend=(0.18+g*0.95)*t*t*aSc.y+flutter*t;
          p.xz+=uWind*bend;
          p.y-=bend*bend*0.35;
          vec3 w=aOff+p; vW=w; vT=t; vG=g; vTone=aTone;
          gl_Position=projectionMatrix*viewMatrix*vec4(w,1.0);
        }`,
      fragmentShader: `${COMMON}
        uniform vec3 uBase, uTip, uSheen, uDry; varying float vT; varying float vG; varying float vTone; varying vec3 vW;
        void main(){
          vec3 c=mix(uBase,uTip,smoothstep(0.0,0.9,vT));
          c=mix(c,uDry,step(0.86,vTone)*0.6*vT);
          c=mix(c,uSheen,vG*vT*0.55);
          c*=0.78+0.22*vT;
          c=mix(c,nightTint(c),uNight);
          c+=lanternGlow(vW)*uNight*0.8;
          gl_FragColor=vec4(applyFog(c,vW),1.0);
        }`,
    });
    grass = new T.Mesh(ig, m); grass.frustumCulled = false; scene.add(grass);
  }

  /* ------------------------------------------------------------------ */
  /* Flores (manchas de cor como na pintura)                             */
  /* ------------------------------------------------------------------ */
  {
    const COUNT = reduce ? 9000 : (small ? 16000 : 42000);
    const quad = new T.PlaneGeometry(1, 1);
    const ig = new T.InstancedBufferGeometry();
    ig.setIndex(quad.index); ig.setAttribute("position", quad.getAttribute("position")); ig.setAttribute("uv", quad.getAttribute("uv"));
    const off = new Float32Array(COUNT * 3), cl = new Float32Array(COUNT * 3), sz = new Float32Array(COUNT);
    const palette = [["#EE93B0", "#F6B6C9", "#D9739A"], ["#F3D44F", "#FFE68A"], ["#FFFFFF", "#F4F1E6"], ["#B9A4E6", "#D6C8F2"]];
    const r = mulberry(21); let n = 0, tries = 0;
    while (n < COUNT && tries < COUNT * 12) {
      tries++;
      const z = 20 - Math.pow(r(), 1.3) * 62;
      const x = (r() * 2 - 1) * (30 + (20 - z) * 1.2);
      const y = heightAt(x, z); if (y < 0.5) continue;
      const pv = fbm(x * 0.025 + 7, z * 0.025, 3);
      if (r() > smooth(-0.15, 0.3, pv) * 0.95 + 0.05) continue;
      const fam = pv > 0.32 ? 0 : pv > 0.18 ? 1 : pv > 0.05 ? 2 : 3;
      const c = new T.Color(palette[fam][Math.floor(r() * palette[fam].length)]);
      off[n * 3] = x; off[n * 3 + 1] = y + 0.26 + r() * 0.34; off[n * 3 + 2] = z;
      cl[n * 3] = c.r; cl[n * 3 + 1] = c.g; cl[n * 3 + 2] = c.b;
      const d = Math.hypot(x, z - 22);
      sz[n] = (0.085 + r() * 0.075) * (1 + d * 0.009);
      n++;
    }
    ig.instanceCount = n; ig.userData.full = n;
    ig.setAttribute("aOff", new T.InstancedBufferAttribute(off, 3));
    ig.setAttribute("aCol", new T.InstancedBufferAttribute(cl, 3));
    ig.setAttribute("aSize", new T.InstancedBufferAttribute(sz, 1));
    const m = new T.ShaderMaterial({
      uniforms: Object.assign({}, U),
      transparent: false,
      vertexShader: `${NOISE}${WIND}
        attribute vec3 aOff; attribute vec3 aCol; attribute float aSize; varying vec2 vUv; varying vec3 vCol; varying vec3 vW;
        void main(){
          float g=gust(aOff.xz);
          vec3 w=aOff; w.xz+=uWind*(0.05+g*0.32)+vec2(sin(uTime*3.0+aOff.x*2.0),cos(uTime*2.6+aOff.z*2.0))*0.025;
          vec4 mv=viewMatrix*vec4(w,1.0);
          mv.xy+=position.xy*aSize;
          vUv=uv; vCol=aCol; vW=w;
          gl_Position=projectionMatrix*mv;
        }`,
      fragmentShader: `${COMMON}
        varying vec2 vUv; varying vec3 vCol; varying vec3 vW;
        void main(){
          vec2 p=vUv-0.5; float a=atan(p.y,p.x); float r=length(p);
          float petal=0.36+0.1*cos(a*5.0);
          if(r>petal) discard;
          vec3 c=vCol*mix(0.82,1.0,smoothstep(petal,0.0,r));
          c=mix(c,vec3(0.98,0.85,0.35),smoothstep(0.08,0.03,r)*0.8);
          c=mix(c,nightTint(c)*1.3,uNight);
          gl_FragColor=vec4(applyFog(c,vW),1.0);
        }`,
    });
    flowers = new T.Mesh(ig, m); flowers.frustumCulled = false; scene.add(flowers);
  }

  /* ------------------------------------------------------------------ */
  /* Pétalas no vento (dia) e vagalumes (noite)                          */
  /* ------------------------------------------------------------------ */
  let petals, flies;
  {
    const N = reduce ? 0 : 170;
    const g = new T.BufferGeometry();
    const seeds = new Float32Array(N * 3); const r = mulberry(3);
    for (let i = 0; i < N * 3; i++) seeds[i] = r();
    g.setAttribute("position", new T.Float32BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute("aSeed", new T.Float32BufferAttribute(seeds, 3));
    petals = new T.Points(g, new T.ShaderMaterial({
      uniforms: Object.assign({}, U), transparent: true, depthWrite: false,
      vertexShader: `uniform float uTime; uniform vec2 uWind; attribute vec3 aSeed; varying float vSpin; varying float vSeed;
        void main(){
          float L=70.0; float t=uTime*(3.0+aSeed.z*3.0)+aSeed.x*L;
          float along=mod(t,L)-L*0.5;
          vec3 w=vec3(-26.0+aSeed.y*60.0, 0.6+aSeed.z*6.0+sin(t*0.4+aSeed.x*9.0)*1.2, 18.0-aSeed.x*60.0);
          w.xz+=uWind*along; w.y+=sin(t*0.9)*0.6;
          vSpin=uTime*(2.0+aSeed.y*4.0)+aSeed.z*6.28; vSeed=aSeed.y;
          vec4 mv=viewMatrix*vec4(w,1.0); gl_PointSize=(70.0+aSeed.z*60.0)/-mv.z; gl_Position=projectionMatrix*mv;
        }`,
      fragmentShader: `uniform float uNight; varying float vSpin; varying float vSeed;
        void main(){
          vec2 p=gl_PointCoord-0.5; float c=cos(vSpin), s=sin(vSpin); p=vec2(c*p.x-s*p.y, s*p.x+c*p.y);
          p.y*=1.0+abs(sin(vSpin*0.7))*1.4;
          if(length(p)>0.32) discard;
          vec3 col=mix(vec3(0.97,0.72,0.8),vec3(1.0,0.95,0.97),vSeed);
          gl_FragColor=vec4(col,(1.0-uNight)*0.95);
        }`,
    }));
    petals.frustumCulled = false; scene.add(petals);

    const FN = 220;
    const fg = new T.BufferGeometry(); const fs = new Float32Array(FN * 3); const fp = new Float32Array(FN * 3);
    for (let i = 0; i < FN; i++) {
      const z = 16 - r() * 70, x = (r() * 2 - 1) * (20 + (16 - z) * 0.8);
      fp[i * 3] = x; fp[i * 3 + 1] = Math.max(heightAt(x, z), 0) + 0.4 + r() * 2.2; fp[i * 3 + 2] = z;
      fs[i * 3] = r(); fs[i * 3 + 1] = r(); fs[i * 3 + 2] = r();
    }
    fg.setAttribute("position", new T.Float32BufferAttribute(fp, 3));
    fg.setAttribute("aSeed", new T.Float32BufferAttribute(fs, 3));
    flies = new T.Points(fg, new T.ShaderMaterial({
      uniforms: Object.assign({}, U), transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: `uniform float uTime; attribute vec3 aSeed; varying float vA;
        void main(){
          vec3 w=position+vec3(sin(uTime*0.3*(0.5+aSeed.x)+aSeed.y*20.0)*1.6, sin(uTime*0.5+aSeed.z*10.0)*0.5, cos(uTime*0.25*(0.5+aSeed.y)+aSeed.x*20.0)*1.6);
          vA=max(0.0,sin(uTime*(1.2+aSeed.z*1.8)+aSeed.x*30.0));
          vec4 mv=viewMatrix*vec4(w,1.0); gl_PointSize=260.0/-mv.z; gl_Position=projectionMatrix*mv;
        }`,
      fragmentShader: `uniform float uNight; varying float vA;
        void main(){ float d=length(gl_PointCoord-0.5); float g=smoothstep(0.5,0.0,d); g=g*g;
          gl_FragColor=vec4(vec3(0.86,0.95,0.48)*g*vA*uNight*1.4,1.0); }`,
    }));
    flies.frustumCulled = false; scene.add(flies);
  }

  /* ------------------------------------------------------------------ */
  /* Câmera, tema, laço                                                  */
  /* ------------------------------------------------------------------ */
  const hillTop = heightAt(HILL.x, HILL.z);
  const BASE = { pos: new T.Vector3(HILL.x - 3.4, hillTop + 2.5, HILL.z + 9.5), target: new T.Vector3(HILL.x + 2.5, 1.0, -70) };
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener("pointermove", (e) => { pointer.x = e.clientX / innerWidth * 2 - 1; pointer.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  const root = document.documentElement;
  const wantNight = () => {
    const t = root.getAttribute("data-theme");
    if (t) return t === "dark" ? 1 : 0;
    return matchMedia("(prefers-color-scheme: dark)").matches ? 1 : 0;
  };
  const wantDusk = () => (root.getAttribute("data-theme") === "dusk" ? 1 : 0);
  let nightTarget = wantNight(), duskTarget = wantDusk();
  U.uNight.value = nightTarget; U.uDusk.value = duskTarget;
  new MutationObserver(() => { nightTarget = wantNight(); duskTarget = wantDusk(); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { nightTarget = wantNight(); });

  let W = 1, H = 1;
  let reflScale = 0.5;
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    const db = renderer.getDrawingBufferSize(new T.Vector2());
    water.material.uniforms.uRes.value.copy(db);
    rt.setSize(Math.round(db.x * reflScale), Math.round(db.y * reflScale));
  }

  const hidden = [];
  function renderReflection() {
    reflectCam.copy(camera);
    reflectCam.position.set(camera.position.x, -camera.position.y, camera.position.z);
    const tgt = new T.Vector3(); camera.getWorldDirection(tgt); tgt.add(camera.position); tgt.y = -tgt.y;
    reflectCam.up.set(0, -1, 0);
    reflectCam.lookAt(tgt);
    reflectCam.updateMatrixWorld();
    water.visible = false; grass.visible = false; flowers.visible = false; petals.visible = false; flies.visible = false;
    U.uReflect.value = 1;
    renderer.setRenderTarget(rt);
    renderer.render(scene, reflectCam);
    renderer.setRenderTarget(null);
    U.uReflect.value = 0;
    water.visible = true; grass.visible = true; flowers.visible = true; petals.visible = true; flies.visible = true;
  }

  /* ------------------------------------------------------------------ */
  /* Estrelas cadentes: riscam o céu e, às vezes, descem correndo pelo   */
  /* vale até mergulhar num lago, como no filme                          */
  /* ------------------------------------------------------------------ */
  const meteors = (() => {
    const N = 5, SEG = 26;
    const rnd = mulberry(909);
    const mat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      uniforms: { uNight: U.uNight },
      vertexShader: `attribute float aA; attribute float aV; varying float vA; varying float vV; void main(){ vA=aA; vV=aV; gl_Position=projectionMatrix*viewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float uNight; varying float vA; varying float vV;
        void main(){ float edge=1.0-abs(vV*2.0-1.0); float a=vA*smoothstep(0.0,0.9,edge); vec3 c=mix(vec3(0.62,0.82,1.0),vec3(1.0,0.97,0.86),vA*vA);
          gl_FragColor=vec4(c*a*(0.75+uNight*0.6),a); }`,
    });
    const headMat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uNight: U.uNight, uA: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float uNight, uA; varying vec2 vUv; void main(){ float d=length(vUv-0.5)*2.0; float core=smoothstep(0.25,0.0,d); float glow=smoothstep(1.0,0.0,d); vec3 c=vec3(1.0,0.96,0.85)*core*1.6+vec3(0.55,0.78,1.0)*glow*glow*0.8; float a=(core+glow*glow*0.7)*uA*(0.8+uNight*0.5); gl_FragColor=vec4(c*a,a); }`,
    });
    const ringMat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uA: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float uA; varying vec2 vUv; void main(){ float d=length(vUv-0.5)*2.0; float r=smoothstep(0.08,0.0,abs(d-0.8))+smoothstep(0.5,0.0,d)*0.5; gl_FragColor=vec4(vec3(0.7,0.88,1.0)*r*uA,r*uA); }`,
    });
    const list = [];
    for (let i = 0; i < N; i++) {
      const g = new T.BufferGeometry();
      const pos = new Float32Array(SEG * 2 * 3), aA = new Float32Array(SEG * 2), aV = new Float32Array(SEG * 2), idx = [];
      for (let k = 0; k < SEG; k++) { aV[k * 2] = 0; aV[k * 2 + 1] = 1; if (k < SEG - 1) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
      g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("aA", new T.BufferAttribute(aA, 1)); g.setAttribute("aV", new T.BufferAttribute(aV, 1)); g.setIndex(idx);
      const trail = new T.Mesh(g, mat); trail.frustumCulled = false; trail.visible = false; scene.add(trail);
      const hm = headMat.clone(); hm.uniforms.uNight = U.uNight;
      const head = new T.Mesh(new T.PlaneGeometry(1, 1), hm); head.visible = false; head.frustumCulled = false; scene.add(head);
      const rm = ringMat.clone();
      const ring = new T.Mesh(new T.PlaneGeometry(1, 1), rm); ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
      list.push({ trail, head, ring, hist: [], t: 0, dur: 0, live: false, kind: "sky", splash: -1 });
    }
    const bez = (a, b, c, k) => { const u = 1 - k; return new T.Vector3(u * u * a.x + 2 * u * k * b.x + k * k * c.x, u * u * a.y + 2 * u * k * b.y + k * k * c.y, u * u * a.z + 2 * u * k * b.z + k * k * c.z); };
    function launch(m, kind) {
      m.kind = kind; m.t = 0; m.live = true; m.hist.length = 0; m.splash = -1;
      if (kind === "sky") {
        const a = new T.Vector3(-160 + rnd() * 320, 70 + rnd() * 60, -170 - rnd() * 160);
        const dir = new T.Vector3(rnd() < 0.5 ? -1 : 1, -0.45 - rnd() * 0.3, 0.1).normalize();
        m.p0 = a; m.p1 = a.clone().addScaledVector(dir, 55); m.p2 = a.clone().addScaledVector(dir, 110);
        m.dur = 1.4 + rnd() * 0.9; m.width = 1.5; m.size = 6;
      } else {
        // desce do céu, corre rente ao campo e mergulha num lago
        const L = LAKES[[0, 2, 3][Math.floor(rnd() * 3)]];
        const tgt = new T.Vector3(L.x + (rnd() - 0.5) * L.rx * 0.7, 0.15, L.z + (rnd() - 0.5) * L.rz * 0.5);
        const side = rnd() < 0.5 ? -1 : 1;
        const dir = new T.Vector3(side, 0, 0.35 * (rnd() - 0.5)).normalize();
        const skim = tgt.clone().addScaledVector(dir, -38); skim.y = Math.max(heightAt(skim.x, skim.z), 0) + 1.4;
        m.p0 = skim.clone().addScaledVector(dir, -50).add(new T.Vector3(0, 60, -20));
        m.p1 = skim; m.p2 = tgt;
        m.dur = 3.2 + rnd() * 1.2; m.width = 0.8; m.size = 3.6;
      }
    }
    let next = 4, lastT = null;
    const view = new T.Vector3(), side = new T.Vector3(), dir = new T.Vector3();
    const step = (t) => {
      const dt = lastT === null ? 0 : Math.max(0, Math.min(0.1, t - lastT)); lastT = t;
      next -= dt;
      if (next <= 0) {
        const m = list.find((x) => !x.live && x.splash < 0);
        if (m) launch(m, Math.random() < 0.45 ? "vale" : "sky");
        const night = U.uNight.value;
        next = (night > 0.5 ? 1.6 : 6) + Math.random() * (night > 0.5 ? 3 : 9);
      }
      list.forEach((m) => {
        if (m.splash >= 0) {
          m.splash += dt;
          const k = m.splash / 1.6;
          m.ring.visible = k < 1; m.ring.scale.setScalar(1 + k * 9); m.ring.material.uniforms.uA.value = (1 - k) * 0.9;
          if (k >= 1) m.splash = -1;
        }
        if (!m.live) { m.trail.visible = false; m.head.visible = false; return; }
        m.t += dt;
        let k = Math.min(1, m.t / m.dur);
        const kk = m.kind === "vale" ? 1 - Math.pow(1 - k, 1.6) : k;
        const p = bez(m.p0, m.p1, m.p2, kk);
        if (m.kind === "vale" && kk > 0.45) p.y = Math.max(p.y, Math.max(heightAt(p.x, p.z), 0) + 0.6 * (1 - kk) + 0.15);
        m.hist.unshift(p); if (m.hist.length > SEG) m.hist.pop();
        const fade = m.kind === "sky" ? Math.sin(Math.PI * k) : Math.min(1, k * 4);
        // fita voltada para a câmera, afinando na cauda
        const pos = m.trail.geometry.attributes.position.array, aA = m.trail.geometry.attributes.aA.array;
        for (let i = 0; i < SEG; i++) {
          const a = m.hist[Math.min(i, m.hist.length - 1)], b = m.hist[Math.min(i + 1, m.hist.length - 1)];
          dir.subVectors(a, b); if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0); dir.normalize();
          view.subVectors(camera.position, a).normalize();
          side.crossVectors(dir, view).normalize();
          const w = m.width * (1 - i / SEG) * (0.6 + 0.4 * fade);
          pos.set([a.x + side.x * w, a.y + side.y * w, a.z + side.z * w], i * 6);
          pos.set([a.x - side.x * w, a.y - side.y * w, a.z - side.z * w], i * 6 + 3);
          const al = Math.pow(1 - i / SEG, 1.5) * fade;
          aA[i * 2] = al; aA[i * 2 + 1] = al;
        }
        m.trail.geometry.attributes.position.needsUpdate = true; m.trail.geometry.attributes.aA.needsUpdate = true;
        m.trail.visible = true; m.head.visible = true;
        m.head.position.copy(p); m.head.quaternion.copy(camera.quaternion); m.head.scale.setScalar(m.size * (0.7 + 0.3 * fade));
        m.head.material.uniforms.uA.value = fade;
        if (k >= 1) {
          m.live = false;
          if (m.kind === "vale") { m.splash = 0; m.ring.position.set(m.p2.x, 0.12, m.p2.z); }
        }
      });
    };
    step.launch = (kind) => { const m = list.find((x) => !x.live && x.splash < 0); if (m) launch(m, kind); };
    return step;
  })();

  let lastBirdT = null;
  function updateWorld(t) {
    U.uTime.value = t;
    meteors(t);
    birds(t, lastBirdT === null ? 0 : Math.max(0, Math.min(0.1, t - lastBirdT))); lastBirdT = t;
    // castelo: percurso elíptico, passos alternados, corpo balançando
    const c = castleAt(t);
    const gy = Math.max(heightAt(c.x, c.z), 0);
    castle.position.set(c.x, gy + 0.35, c.z);
    castle.rotation.y = c.heading;
    const stepT = t * 1.6;
    castleBody.position.y = Math.abs(Math.sin(stepT)) * 0.45;
    castleBody.rotation.x = Math.sin(stepT) * 0.035;
    castleBody.rotation.z = Math.sin(stepT * 0.5) * 0.02;
    legs.forEach((L) => {
      const s = Math.sin(stepT + L.ph);
      L.hip.rotation.z = 0.25 + s * 0.34;
      L.knee.rotation.z = -0.55 - Math.max(0, Math.cos(stepT + L.ph)) * 0.55;
    });
    castle.updateMatrixWorld(true);
    // fumaça: nasce no topo de cada chaminé e sobe levada pelo vento
    const pa = smoke.g.attributes.position.array, aa = smoke.g.attributes.aAge.array;
    const wd = U.uWind.value;
    smoke.data.forEach((sm, i) => {
      const age = (sm.age + t * 0.075) % 1;
      if (sm.last === undefined || age < sm.last) sm.o.copy(chimneyTops[sm.src % chimneyTops.length]).applyMatrix4(castleBody.matrixWorld);
      sm.last = age;
      pa[i * 3] = sm.o.x + wd.x * age * 16 + Math.sin(age * 6 + sm.seed * 9) * 1.2;
      pa[i * 3 + 1] = sm.o.y + age * 14 + age * age * 6;
      pa[i * 3 + 2] = sm.o.z + wd.y * age * 16 + Math.cos(age * 5 + sm.seed * 7) * 1.0;
      aa[i] = age;
    });
    smoke.g.attributes.position.needsUpdate = true; smoke.g.attributes.aAge.needsUpdate = true;
    actors.forEach((a) => a(t));
    // trem: corre sobre os trilhos e volta pelo outro lado, fora de vista
    const tx = -145 + ((t * 7 + 140) % 290);
    train.position.set(tx, Math.max(heightAt(tx, TRACK_Z), 0) + 0.12 + Math.sin(t * 9) * 0.015, TRACK_Z);
    // grimórios orbitando o topo da torre
    towerBooks.forEach((m, i) => {
      const a = t * 0.35 + i / towerBooks.length * Math.PI * 2;
      m.position.set(TOWER.x + Math.cos(a) * 4.6, TOWER.y + 19.4 + Math.sin(t * 0.9 + i) * 0.45, TOWER.z + Math.sin(a) * 4.6);
      m.rotation.set(Math.sin(t + i) * 0.2, -a, 0.15);
    });
    cloudMesh.position.x = Math.sin(t * 0.006) * 40;
    cloudMesh.userData.mist.opacity = 0.55 * (1 - U.uNight.value * 0.75);
    { const H = cloudMesh.userData.hillMist; const n = U.uNight.value, dk = U.uDusk.value * (1 - n);
      H.mat.opacity = n * 0.34 + dk * 0.16; H.mat.color.setRGB(0.62 + dk * 0.36, 0.70 + dk * 0.06, 0.82 - dk * 0.1);
      const hi = Math.min(1, Math.max(0, (camera.position.y - 12) / 25)); H.low.opacity = H.mat.opacity * 0.6 * (1 - hi); H.low.color.copy(H.mat.color);
      H.group.children.forEach((sp) => { sp.position.x = sp.userData.x + Math.sin(t * 0.03 * sp.userData.sp + sp.userData.x) * 18; }); }
    U.uGustAmp.value = 1 + U.uNight.value * 0.6 + U.uDusk.value * 0.15;
    U.uSun.value.copy(DAY_SUN).lerp(DUSK_SUN_LIGHT, U.uDusk.value * (1 - U.uNight.value)).normalize();
  }

  const lastTgt = new T.Vector3();
  function place(pos, target) {
    lastTgt.copy(target);
    camera.position.copy(pos); camera.lookAt(target); camera.updateMatrixWorld();
    sky.position.copy(camera.position);
  }

  // Qualidade adaptativa: se o computador sofrer, baixa resolução, reflexo e grama; se sobrar, sobe de novo
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const LEVELS = [
    { dpr: DPR, refl: 0.5, grass: 1, reflEvery: 1 },
    { dpr: Math.min(DPR, 1.5), refl: 0.42, grass: 0.8, reflEvery: 2 },
    { dpr: Math.min(DPR, 1.25), refl: 0.36, grass: 0.62, reflEvery: 2 },
    { dpr: 1, refl: 0.3, grass: 0.45, reflEvery: 3 },
  ];
  const Q = { level: small ? 1 : 0, frames: 0, acc: 0, n: 0, since: 0, good: 0 };
  function applyQuality() {
    const L = LEVELS[Q.level];
    renderer.setPixelRatio(L.dpr); reflScale = L.refl;
    [grass, flowers].forEach((m) => { if (m && m.geometry.userData.full) m.geometry.instanceCount = Math.round(m.geometry.userData.full * L.grass); });
    resize();
  }
  function measure(ms) {
    Q.acc += ms; Q.n++; Q.since += ms;
    if (Q.acc < 2000) return;
    const avg = Q.acc / Q.n; Q.acc = 0; Q.n = 0;
    if (avg > 23 && Q.level < LEVELS.length - 1 && Q.since > 2500) { Q.level++; Q.since = 0; Q.good = 0; applyQuality(); }
    else if (avg < 17.6 && Q.level > 0) { Q.good += 2000; if (Q.good > 16000) { Q.level--; Q.since = 0; Q.good = 0; applyQuality(); } }
    else Q.good = 0;
  }
  function render() {
    sky.position.copy(camera.position);
    Q.frames++;
    if (Q.frames % LEVELS[Q.level].reflEvery === 0) renderReflection();
    sky.position.copy(camera.position);
    renderer.render(scene, camera);
  }

  /* Quadros do roteiro e da capa, renderizados da própria cena */
  const PRESETS = {
    capa: { pos: [HILL.x - 1.6, hillTop + 1.55, HILL.z + 4.8], target: [HILL.x + 1.4, hillTop + 0.3, -60], night: 0, t: 44 },
    torii: { pos: [TORII.x + 1.6, 2.15, TORII.z + 11], target: [TORII.x - 1.5, 3.6, -120], night: 0, t: 52 },
    filme: { castle: [-46, 6, 40], night: 1, t: 150 },
    nuvens: { pos: [0, 48, 70], target: [0, 4, -70], night: 0, t: 20, haze: 0.28 },
    vale: { pos: [-28, 10, 14], target: [14, 1, -60], night: 0, t: 90 },
  };
  function captureFrames() {
    const shots = {};
    const keepNight = U.uNight.value;
    for (const [k, p] of Object.entries(PRESETS)) {
      U.uNight.value = p.night; U.uHaze.value = p.haze || 0;
      updateWorld(p.t);
      if (p.castle) {
        const cp = castle.position;
        place(new T.Vector3(cp.x + p.castle[0], Math.max(heightAt(cp.x + p.castle[0], cp.z + p.castle[2]), 0) + p.castle[1], cp.z + p.castle[2]), new T.Vector3(cp.x, cp.y + 11, cp.z));
      } else place(new T.Vector3(...p.pos), new T.Vector3(...p.target));
      render();
      try { shots[k] = canvas.toDataURL("image/jpeg", 0.86); } catch (e) { /* ignorado */ }
    }
    U.uNight.value = keepNight; U.uHaze.value = 0;
    document.querySelectorAll("[data-shot]").forEach((el) => {
      const s = shots[el.getAttribute("data-shot")];
      if (s) { el.style.backgroundImage = `url(${s})`; el.classList.add("has-shot"); }
    });
  }


  /* ------------------------------------------------------------------ */
  /* Entrada: caminho → torii → nuvens → filme → chegada                 */
  /* ------------------------------------------------------------------ */
  const $ = (id) => document.getElementById(id);
  const V3 = (a) => new T.Vector3(a[0], a[1], a[2]);
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const hero = canvas.closest(".hero");
  const introEl = $("intro");
  const intro = { active: false, i: 0, t: 0, shots: [], inFilm: false, filmStart: 0 };
  function buildShots() {
    const H = hillTop, TX = TORII.x, TZ = TORII.z;
    // eixo do portão: a câmera chega de frente e atravessa pelo meio
    const ax = (d, y) => V3([TX + Math.sin(TORII.rot) * d, heightAt(TX + Math.sin(TORII.rot) * d, TZ + Math.cos(TORII.rot) * d) + y, TZ + Math.cos(TORII.rot) * d]);
    const path1 = [ax(10, 2.4), ax(-40, 2.6)];
    return [
      { d: 3.8, from: [BASE.pos.clone(), BASE.target.clone()], to: path1 },
      { d: 3.2, from: path1, to: [ax(-110, 30), ax(-420, 60)], haze: [0, 1], hazeCurve: 2.4 },
      { film: true, d: 4.6, from: [V3([TX + 5.5, 1.4, TZ + 6]), V3([TX, 5.4, TZ])], to: [V3([TX - 4.8, 1.7, TZ + 6.5]), V3([TX, 5.7, TZ])], night: 0, line: "Tudo começa com um traço." },
      { d: 5.0, from: [V3([-70, 26, -10]), V3([0, 0, -130])], to: [V3([-22, 20, -34]), V3([22, 0, -150])], night: 0, line: "Um lugar para atravessar." },
      { d: 4.2, follow: [[-34, 5, 38], [-20, 7, 27]], night: 0 },
      { d: 5.0, from: [V3([HILL.x - 2.8, H + 1.0, HILL.z + 5.2]), V3([HILL.x + 0.8, H + 0.9, -40])], to: [V3([HILL.x + 1.8, H + 1.3, HILL.z + 4.6]), V3([HILL.x + 0.2, H + 0.8, -40])], night: 1, line: "Gente para dividir o caminho." },
      { d: 6.4, from: [V3([-24, 4, 44]), V3([10, 3, -80])], to: [V3([-12, 13, 34]), V3([10, 2, -80])], night: [1, 0], line: "A jornada é o que dá forma ao mundo.", long: true },
      { d: 3.4, black: true, seal: true, from: [BASE.pos.clone(), BASE.target.clone()], to: [BASE.pos.clone(), BASE.target.clone()] },
      { d: 3.2, arrive: true, from: [V3([0, 70, 70]), V3([0, 0, -60])], to: [V3([0, 38, 52]), V3([4, 0, -70])], night: 0, haze: [1, 0], hazeCurve: 0.6 },
      { d: 3.6, from: [V3([0, 38, 52]), V3([4, 0, -70])], to: exploreEl ? [OVERVIEW.pos.clone(), OVERVIEW.tgt.clone()] : [BASE.pos.clone(), BASE.target.clone()], night: [0, nightTarget] },
    ];
  }
  function startShot(i) {
    intro.i = i; intro.t = 0;
    const s = intro.shots[i];
    if (!s) { endIntro(); return; }
    if (s.film && intro.noFilm) { startShot(intro.shots.findIndex((x) => x.arrive)); return; }
    if (s.film && !intro.inFilm) {
      intro.inFilm = true; intro.filmStart = performance.now() / 1000;
      introEl.classList.add("film"); $("introSkip").hidden = false;
    }
    if (s.arrive) { intro.inFilm = false; introEl.classList.remove("film"); $("introFade").style.opacity = "0"; $("introSkip").hidden = true; }
    const line = $("introLine");
    line.classList.remove("show");
    if (s.line) {
      line.textContent = s.line; line.classList.toggle("long", !!s.long);
      line.style.setProperty("--dur", s.d + "s"); void line.offsetWidth; line.classList.add("show");
    }
    $("introSeal").classList.toggle("show", !!s.seal);
  }
  function introStep(dt) {
    const s = intro.shots[intro.i];
    if (!s) return;
    intro.t += dt;
    const k = Math.min(1, intro.t / s.d), e = ease(k);
    let pos, tgt;
    if (s.follow) {
      const cp = castle.position, off = V3(s.follow[0]).lerp(V3(s.follow[1]), e);
      pos = new T.Vector3(cp.x + off.x, 0, cp.z + off.z);
      pos.y = Math.max(heightAt(pos.x, pos.z), 0) + off.y;
      tgt = new T.Vector3(cp.x, cp.y + 10, cp.z);
    } else {
      pos = s.from[0].clone().lerp(s.to[0], e);
      tgt = s.from[1].clone().lerp(s.to[1], e);
    }
    if (s.night !== undefined) U.uNight.value = Array.isArray(s.night) ? lerp(s.night[0], s.night[1], smooth(0.15, 0.85, k)) : s.night;
    U.uHaze.value = s.haze ? lerp(s.haze[0], s.haze[1], Math.pow(k, s.hazeCurve || 1)) : 0;
    place(pos, tgt);
    if (intro.inFilm) {
      const edge = Math.min(intro.t, s.d - intro.t);
      $("introFade").style.opacity = s.black ? "1" : String(1 - smooth(0, 0.45, edge));
      if (performance.now() / 1000 - intro.filmStart > 5) $("introSkip").hidden = true;
    }
    if (k >= 1) startShot(intro.i + 1);
  }
  function playIntro(full = true) {
    if (intro.active || !introEl) return;
    if (explore.active) exitExplore(false);
    intro.shots = buildShots(); intro.active = true; intro.inFilm = false; intro.noFilm = !full;
    introEl.hidden = false; hero.classList.add("playing"); document.documentElement.classList.add("intro-on");
    requestAnimationFrame(resize);
    startShot(0);
    window.dispatchEvent(new CustomEvent("vale:intro", { detail: "start" }));
    setRunning(true);
  }
  function skipFilm() {
    const idx = intro.shots.findIndex((x) => x.arrive);
    if (idx > 0) startShot(idx);
  }
  function endIntro() {
    intro.active = false; intro.inFilm = false;
    introEl.hidden = true; introEl.classList.remove("film"); hero.classList.remove("playing"); document.documentElement.classList.remove("intro-on");
    $("introLine").classList.remove("show"); $("introSeal").classList.remove("show");
    U.uHaze.value = 0; U.uNight.value = nightTarget; U.uDusk.value = duskTarget;
    requestAnimationFrame(resize);
    window.dispatchEvent(new CustomEvent("vale:intro", { detail: "end" }));
    try { sessionStorage.setItem("vale-entrou", "1"); } catch (e) { /* sem armazenamento */ }
    if (exploreEl) startExplore(true);
    else if (reduce) { place(BASE.pos, BASE.target); render(); }
  }
  if ($("introSkip")) $("introSkip").addEventListener("click", skipFilm);
  // seek: posiciona a entrada num corte e num ponto do corte (usado para revisar quadros)
  let peekCam = null;
  window.vale = { toCover: () => { if (explore.active) exitExplore(true); }, info: () => ({ mem: Object.assign({}, renderer.info.memory), prog: renderer.info.programs ? renderer.info.programs.length : 0, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, nodes: scene.children.length }), peek: (p, t) => { peekCam = p ? { p: new T.Vector3(p[0], p[1] + hillTop, p[2]), t: new T.Vector3(t[0], t[1] + hillTop, t[2]) } : null; }, star: (k) => meteors.launch(k || "vale"), playIntro, go: (id) => { if (!explore.active) startExplore(); go(id); }, seek(i, frac = 0.5) { if (!intro.active) playIntro(); startShot(i); intro.t = intro.shots[i].d * frac; } };


  /* ------------------------------------------------------------------ */
  /* Exploração: lugares do vale, marcadores, minimapa e cartões         */
  /* ------------------------------------------------------------------ */
  const exploreEl = $("explore");
  const OVERVIEW = { pos: new T.Vector3(-6, 44, 60), tgt: new T.Vector3(12, 0, -74) };
  const openWorld = (n) => { if (window.mundos) window.mundos.open(n); };
  // Teletransporte para dentro da Torre: círculo de runas, pilar de luz e clarão
  const tp = (() => {
    const g = new T.Group(); g.visible = false; scene.add(g);
    const circle = new T.Mesh(new T.PlaneGeometry(16, 16), new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uT: { value: 0 }, uK: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float uT, uK; varying vec2 vUv;
        void main(){
          vec2 p=vUv*2.0-1.0; float r=length(p); float a=atan(p.y,p.x);
          float grow=smoothstep(0.0,0.45,uK);
          float rings=smoothstep(0.016,0.0,abs(r-0.92*grow))+smoothstep(0.012,0.0,abs(r-0.78*grow))+smoothstep(0.01,0.0,abs(r-0.42*grow));
          float runes=step(0.8*grow,r)*step(r,0.9*grow)*step(0.55,fract(a*5.09+uT*1.5))*step(fract(a*20.37+uT*1.5),0.6);
          float star=0.0;
          for(int k=0;k<5;k++){ float ang=float(k)*1.2566+uT*0.8; vec2 d=vec2(cos(ang),sin(ang)); star+=smoothstep(0.012,0.0,abs(dot(p,d)-0.36*grow)); }
          star*=step(r,0.78*grow);
          float glow=(rings+runes*0.8+star*0.7)*(0.6+0.4*sin(uT*8.0));
          float fade=1.0-smoothstep(0.85,1.0,uK);
          vec3 col=mix(vec3(0.45,0.7,1.0),vec3(1.0,0.85,0.5),smoothstep(0.3,0.9,uK));
          gl_FragColor=vec4(col*glow*fade*1.4,glow*fade);
        }`,
    }));
    circle.rotation.x = -Math.PI / 2; g.add(circle);
    const pillar = new T.Mesh(new T.CylinderGeometry(3.4, 4.2, 60, 32, 1, true), new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: { uT: { value: 0 }, uK: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float uT, uK; varying vec2 vUv;
        void main(){ float rise=smoothstep(0.45,0.85,uK); float h=step(vUv.y,rise); float streak=0.6+0.4*sin(vUv.x*60.0+uT*6.0)*sin(vUv.y*20.0-uT*12.0);
          float a=h*(1.0-vUv.y)*streak*0.55*(1.0-smoothstep(0.9,1.0,uK)); gl_FragColor=vec4(vec3(0.7,0.85,1.0)*a,a); }`,
    }));
    pillar.position.y = 30; g.add(pillar);
    const sp = new T.BufferGeometry(), spp = [], rs = mulberry(5);
    for (let i = 0; i < 160; i++) { const a = rs() * Math.PI * 2, r = 1 + rs() * 6; spp.push(Math.cos(a) * r, rs() * 4, Math.sin(a) * r); }
    sp.setAttribute("position", new T.Float32BufferAttribute(spp, 3));
    const sparks = new T.Points(sp, new T.PointsMaterial({ color: 0xcfe4ff, size: 0.35, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending })); g.add(sparks);
    const flash = document.createElement("div"); flash.className = "tp-flash"; document.body.appendChild(flash);
    return { g, circle, pillar, sparks, flash, t: -1 };
  })();
  function teleport() {
    if (tp.t >= 0) return;
    tp.g.position.set(TOWER.x, TOWER.y + 0.75, TOWER.z); tp.g.visible = true; tp.t = 0;
    showCard(null);
    try { const A = window.AudioContext || window.webkitAudioContext; const ctx = teleport.ctx || (teleport.ctx = new A()); const now = ctx.currentTime, o = ctx.createOscillator(), g2 = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(220, now); o.frequency.exponentialRampToValueAtTime(1320, now + 1.8); g2.gain.setValueAtTime(0, now); g2.gain.linearRampToValueAtTime(0.12, now + 0.4); g2.gain.linearRampToValueAtTime(0, now + 2.0); o.connect(g2); g2.connect(ctx.destination); o.start(now); o.stop(now + 2.1); } catch (e) { /* sem áudio */ }
  }
  function tpStep(dt) {
    if (tp.t < 0) return;
    tp.t += dt;
    const k = Math.min(1, tp.t / 2.4);
    tp.circle.material.uniforms.uK.value = k; tp.circle.material.uniforms.uT.value = tp.t;
    tp.pillar.material.uniforms.uK.value = k; tp.pillar.material.uniforms.uT.value = tp.t;
    tp.circle.rotation.z = tp.t * (0.4 + k * 3);
    tp.sparks.material.opacity = Math.min(1, k * 2) * (1 - smooth(0.85, 1, k));
    tp.sparks.position.y = k * 18; tp.sparks.rotation.y = tp.t * 1.5;
    if (k > 0.72 && !tp.flashed) { tp.flashed = true; tp.flash.classList.add("on"); }
    if (k >= 1 && !tp.opened) {
      tp.opened = true;
      if (window.mundos && window.mundos.worlds.torre) window.mundos.worlds.torre.tpIn = true;
      openWorld("torre");
      setTimeout(() => tp.flash.classList.remove("on"), 120);
      setTimeout(() => { tp.t = -1; tp.g.visible = false; tp.flashed = false; tp.opened = false; }, 400);
    }
  }
  const PLACES = {
    torii: {
      k: "門", name: "Torii", kicker: "A entrada",
      text: "Por aqui se entra no vale. Daqui você volta para a capa ou revê o filme.",
      anchor: () => new T.Vector3(TORII.x, heightAt(TORII.x, TORII.z) + 8.4, TORII.z),
      view: () => ({ pos: new T.Vector3(TORII.x + 2.2, 4.4, TORII.z + 13.5), tgt: new T.Vector3(TORII.x, 3.6, TORII.z - 6) }),
      actions: [{ label: "Voltar à capa", primary: true, run: () => exitExplore(true) }, { label: "Ver o filme de novo", run: () => playIntro(true) }],
    },
    castelo: {
      k: "城", name: "Castelo do Howl", kicker: "Os projetos",
      text: "Entra-se pela porta dos fundos, como no filme. Lá dentro, o Calcifer guia: primeiro o quarto, depois as portas.",
      anchor: () => castle.position.clone().add(new T.Vector3(0, 15, 0)),
      view: () => { const cp = castle.position; return { pos: new T.Vector3(cp.x - 30, cp.y + 5, cp.z + 36), tgt: new T.Vector3(cp.x, cp.y + 7, cp.z) }; },
      actions: [
        { label: "Entrar no castelo", primary: true, run: () => openWorld("castelo") },
      ],
    },
    torre: {
      k: "塔", name: "Torre dos Grimórios", kicker: "As matérias",
      text: "Nove grimórios, um para cada matéria. Cada atividade é um feitiço aprendido.",
      anchor: () => new T.Vector3(TOWER.x, TOWER.y + 26.5, TOWER.z),
      view: () => ({ pos: new T.Vector3(TOWER.x - 21, TOWER.y + 10, TOWER.z + 30), tgt: new T.Vector3(TOWER.x, TOWER.y + 11, TOWER.z) }),
      actions: [{ label: "Entrar na Torre", primary: true, run: () => teleport() }],
    },
    trem: {
      k: "汽", name: "Trem sobre a água", kicker: "A galeria",
      text: "As lembranças passam pela janela, ao entardecer.",
      anchor: () => train.position.clone().add(new T.Vector3(-5.5, 4.2, 0)),
      view: () => { const tp = train.position; return { pos: new T.Vector3(tp.x - 15, tp.y + 6.5, TRACK_Z + 21), tgt: new T.Vector3(tp.x - 3, tp.y + 0.6, TRACK_Z) }; },
      actions: [{ label: "Embarcar", primary: true, run: () => openWorld("trem") }],
    },
    estacao: {
      k: "駅", name: "Estação do fim da linha", kicker: "Fim da linha",
      text: "Toda viagem termina numa estação. Aqui ficam o contato, as redes e os créditos. E o último trem, o que não volta mais.",
      anchor: () => new T.Vector3(STATION.x, STATION.y + 6.4, STATION.z),
      view: () => { const wide = innerWidth > 900; return wide ? { pos: new T.Vector3(STATION.x - 7.5, STATION.y + 4.4, STATION.z + 14), tgt: new T.Vector3(STATION.x - 6.2, STATION.y + 1.6, STATION.z - 1) } : { pos: new T.Vector3(STATION.x - 1, STATION.y + 6.5, STATION.z + 17), tgt: new T.Vector3(STATION.x - 1, STATION.y - 2.5, STATION.z - 1) }; },
      footer: true,
      actions: [{ label: "Pegar o último trem", primary: true, run: () => openWorld("ultimo") }, { label: "Voltar à capa", run: () => exitExplore(true) }, { label: "Ver o filme de novo", run: () => playIntro(true) }],
    },
  };
  const explore = { active: false, place: null, from: null, k: 1, markers: {}, coverFrom: null, coverK: 1 };
  if (exploreEl) {
    const mk = $("markers");
    Object.entries(PLACES).forEach(([id, P]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "marker"; b.dataset.place = id;
      b.innerHTML = `<b aria-hidden="true">${P.k}</b><span>${P.name}</span>`;
      b.addEventListener("click", () => go(id));
      mk.appendChild(b); explore.markers[id] = b;
    });
    // minimapa desenhado com os lagos reais do terreno
    const mm = $("minimap");
    const mx = (x) => (x + 130) / 260 * 200, mz = (z) => (z + 220) / 250 * 130;
    const lakes = LAKES.map((L) => `<ellipse cx="${mx(L.x).toFixed(1)}" cy="${mz(L.z).toFixed(1)}" rx="${(L.rx / 260 * 200 * 0.8).toFixed(1)}" ry="${(L.rz / 250 * 130 * 0.85).toFixed(1)}"/>`).join("");
    mm.innerHTML = `<svg viewBox="0 0 200 130" aria-hidden="true"><rect width="200" height="130" rx="6" class="mm-land"/><g class="mm-lake">${lakes}</g>
      <line class="mm-track" x1="0" x2="200" y1="${mz(TRACK_Z)}" y2="${mz(TRACK_Z)}"/></svg>`;
    Object.entries(PLACES).forEach(([id, P]) => {
      const d = document.createElement("button");
      d.type = "button"; d.className = "mm-dot"; d.dataset.place = id; d.textContent = P.k;
      d.setAttribute("aria-label", P.name);
      d.addEventListener("click", () => go(id));
      mm.appendChild(d); explore.markers[id + "-mm"] = d;
    });
    explore.mm = { mx, mz };
    $("overviewBtn").addEventListener("click", () => go(null));
    if ($("mapBtn")) $("mapBtn").addEventListener("click", () => { if (vmap) vmap.open(); });
    $("placeClose").addEventListener("click", () => go(null));
    addEventListener("keydown", (e) => { if (e.key === "Escape" && explore.active && explore.place && !document.documentElement.classList.contains("perfil-on") && $("world").hidden) go(null); });
  }
  /* ---------------- Mapa ilustrado do vale (aparece no fim do filme) ---------------- */
  const vmap = (() => {
    if (!exploreEl) return null;
    const X = (x) => 40 + (x + 150) / 300 * 920, Y = (z) => 140 + (z + 235) / 270 * 450;
    const SX = (r) => r / 300 * 920, SZ = (r) => r / 270 * 450;
    const f = (n) => n.toFixed(1);
    const rr = mulberry(404);
    // montanhas do horizonte
    let mts = "", snow = "";
    for (let k = 0; k < 9; k++) {
      const cx = 20 + k * 122 + (rr() - 0.5) * 40, h = 60 + rr() * 50, w = 110 + rr() * 60, base = 140;
      mts += `<path d="M${f(cx - w)} ${base} L${f(cx)} ${f(base - h)} L${f(cx + w)} ${base}Z"/>`;
      snow += `<path d="M${f(cx - w * 0.22)} ${f(base - h * 0.78)} L${f(cx)} ${f(base - h)} L${f(cx + w * 0.22)} ${f(base - h * 0.78)} L${f(cx + w * 0.08)} ${f(base - h * 0.72)} L${f(cx)} ${f(base - h * 0.8)} L${f(cx - w * 0.1)} ${f(base - h * 0.7)}Z"/>`;
    }
    // água tirada do próprio terreno: círculos sobrepostos viram margens orgânicas
    let shore = "", water = "", deep = "";
    for (let x = -150; x <= 150; x += 3) for (let z = -232; z <= 34; z += 3) {
      const h = heightAt(x, z);
      if (h < 0.02) {
        const cx = f(X(x)), cy = f(Y(z));
        shore += `<circle cx="${cx}" cy="${cy}" r="7.4"/>`; water += `<circle cx="${cx}" cy="${cy}" r="5.6"/>`;
        if (h < -0.9) deep += `<circle cx="${cx}" cy="${cy}" r="4.6"/>`;
      }
    }
    const lakes = `<g fill="#34587E" filter="url(#vmGoo)">${shore}</g><g fill="#1D3553" filter="url(#vmGoo)">${water}</g><g fill="#18304C" filter="url(#vmGoo)">${deep}</g>`;
    const ripples = LAKES.map((L) => `<ellipse cx="${f(X(L.x))}" cy="${f(Y(L.z))}" rx="${f(SX(L.rx) * 0.62)}" ry="${f(SZ(L.rz) * 0.55)}"/>`).join("");
    // árvores em tufos
    const treeSpots = [[-38, -58], [-44, -62], [-33, -66], [-92, -84], [-86, -90], [52, -62], [60, -58], [57, -70], [118, -104], [26, -150], [-20, -200], [-120, -60], [-130, 0], [130, -10], [100, 10], [-60, 20]];
    const trees = treeSpots.map(([x, z]) => { let s = ""; for (let k = 0; k < 4; k++) s += `<circle cx="${f(X(x) + (rr() - 0.5) * 16)}" cy="${f(Y(z) + (rr() - 0.5) * 10)}" r="${f(4 + rr() * 4)}"/>`; return s; }).join("");
    // trilho pontilhado e rota do castelo
    const P = CASTLE_PATH;
    const svg = `<svg class="vm-svg" viewBox="0 0 1000 620" role="img" aria-label="Mapa ilustrado do vale">
      <defs>
        <pattern id="vmDots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.06)"/></pattern>
        <radialGradient id="vmVig" cx="50%" cy="55%" r="70%"><stop offset="60%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="rgba(0,0,0,0.45)"/></radialGradient>
        <filter id="vmGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
        <filter id="vmGoo"><feGaussianBlur stdDeviation="3.2"/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"/></filter>
      </defs>
      <rect width="1000" height="620" fill="#1A2420"/>
      <rect y="0" width="1000" height="140" fill="#16202E"/>
      <g fill="#223047">${mts}</g><g fill="#A9B8CC" opacity="0.9">${snow}</g>
      <rect width="1000" height="620" fill="url(#vmDots)"/>
      <path d="M0 140 Q250 128 500 138 T1000 134 L1000 146 L0 146Z" fill="#1E2B24"/>
      <g class="vm-lakes">${lakes}</g>
      <g fill="none" stroke="rgba(160,200,240,0.13)" stroke-width="1" stroke-dasharray="6 7">${ripples}</g>
      <ellipse cx="${f(X(62))}" cy="${f(Y(-100))}" rx="20" ry="10" fill="#2C4A32" stroke="#3E6446" stroke-width="1.4"/>
      <ellipse cx="${f(X(6))}" cy="${f(Y(18))}" rx="70" ry="20" fill="#24382A"/>
      <g fill="#2B4632">${trees}</g>
      <line x1="${f(X(-136))}" x2="${f(X(136))}" y1="${f(Y(TRACK_Z))}" y2="${f(Y(TRACK_Z))}" stroke="#EFE6D2" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="0.1 7" opacity="0.85"/>
      <path d="M${f(X(TORII.x))} ${f(Y(TORII.z) + 8)} Q ${f(X(8))} ${f(Y(6))} ${f(X(HILL.x))} ${f(Y(HILL.z))}" fill="none" stroke="#B9A98A" stroke-width="1.4" stroke-dasharray="2 5" opacity="0.7"/>

      <g class="vm-place" data-place="torre" tabindex="0" role="button" aria-label="Torre dos Grimórios: as matérias" transform="translate(${f(X(62))} ${f(Y(-100))})">
        <circle class="vm-halo" r="48" cy="-30"/>
        <ellipse cx="0" cy="2" rx="26" ry="9" fill="#2F5236" stroke="#47724E" stroke-width="1.2"/>
        <g fill="#5A6470"><circle cx="-16" cy="1" r="3"/><circle cx="15" cy="3" r="2.5"/><circle cx="-6" cy="5" r="2"/></g>
        <path d="M-9 0 L-7.5 -50 L7.5 -50 L9 0Z" fill="#8D8790"/>
        <path d="M-9 0 L-7.5 -50 L-2 -50 L-3 0Z" fill="#6E6872"/>
        <g stroke="#5E5862" stroke-width="0.8"><line x1="-8.6" x2="8.6" y1="-12" y2="-12"/><line x1="-8.3" x2="8.3" y1="-26" y2="-26"/><line x1="-8" x2="8" y1="-40" y2="-40"/></g>
        <rect x="-11" y="-54" width="22" height="4" rx="1" fill="#6E6872"/>
        <path d="M-12 -54 Q0 -86 12 -54Z" fill="#33456A"/><path d="M-12 -54 Q-3 -84 0 -84 L-2 -54Z" fill="#26344F"/>
        <line x1="0" y1="-84" x2="0" y2="-92" stroke="#2A2A30" stroke-width="1.2"/><path d="M0 -92 L7 -90 L0 -88Z" fill="#C22026"/>
        <g fill="#FFC86A"><rect x="-2.5" y="-47" width="5" height="6" rx="2.5"/><rect x="2" y="-33" width="4" height="5" rx="2"/><rect x="-5" y="-21" width="4" height="5" rx="2"/></g>
        <rect x="-3" y="-8" width="6" height="8" rx="3" fill="#2A1C16"/>
        <g><rect x="-22" y="-70" width="6" height="8" rx="1" fill="#9C3434" transform="rotate(-18 -19 -66)"/><rect x="16" y="-64" width="6" height="8" rx="1" fill="#3E4C86" transform="rotate(14 19 -60)"/><rect x="-26" y="-44" width="5" height="7" rx="1" fill="#4E7A4C" transform="rotate(10 -23 -40)"/><rect x="21" y="-40" width="5" height="7" rx="1" fill="#A4743A" transform="rotate(-12 23 -36)"/></g>
        <g class="vm-label" transform="translate(0 -104)"><text class="vm-n" text-anchor="middle">TORRE DOS GRIMÓRIOS</text><text class="vm-s" y="15" text-anchor="middle">塔 · MATÉRIAS</text></g>
      </g>
      <g class="vm-place" data-place="torii" tabindex="0" role="button" aria-label="Torii: a entrada" transform="translate(${f(X(TORII.x))} ${f(Y(TORII.z))})">
        <circle class="vm-halo" r="46" cy="-10"/>
        <ellipse cx="0" cy="12" rx="34" ry="6" fill="rgba(0,0,0,0.25)"/>
        <path d="M-36 -32 Q0 -42 36 -32 L37 -27 Q0 -36 -37 -27Z" fill="#1C1414"/>
        <path d="M-33 -27 Q0 -34 33 -27 L33 -22 Q0 -29 -33 -22Z" fill="#C22026"/>
        <rect x="-28" y="-14" width="56" height="4.5" rx="1" fill="#C22026"/>
        <rect x="-22" y="-24" width="6.5" height="36" fill="#C22026"/><rect x="15.5" y="-24" width="6.5" height="36" fill="#C22026"/>
        <rect x="-22" y="-24" width="2.5" height="36" fill="#9A1A1A"/><rect x="15.5" y="-24" width="2.5" height="36" fill="#9A1A1A"/>
        <rect x="-23.5" y="8" width="9.5" height="4" fill="#1C1414"/><rect x="14" y="8" width="9.5" height="4" fill="#1C1414"/>
        <rect x="-4.5" y="-23" width="9" height="9" fill="#1C1414"/><rect x="-2.5" y="-21" width="5" height="5" fill="#C9A24A"/>
        <g><rect x="-47" y="-2" width="7" height="3" fill="#8C8A90"/><rect x="-45.5" y="1" width="4" height="5" fill="#FFB65A"/><rect x="-46.5" y="6" width="6" height="7" fill="#8C8A90"/>
           <rect x="40" y="-2" width="7" height="3" fill="#8C8A90"/><rect x="41.5" y="1" width="4" height="5" fill="#FFB65A"/><rect x="40.5" y="6" width="6" height="7" fill="#8C8A90"/></g>
        <g class="vm-label" transform="translate(0 34)"><text class="vm-n" text-anchor="middle">TORII · ENTRADA</text><text class="vm-s" y="15" text-anchor="middle">門 · VOLTAR À CAPA</text></g>
      </g>
      <g class="vm-place" data-place="estacao" tabindex="0" role="button" aria-label="Estação do fim da linha: contato e créditos" transform="translate(${f(X(STATION.x))} ${f(Y(STATION.z))})">
        <circle class="vm-halo" r="40" cy="-8"/>
        <rect x="-30" y="0" width="60" height="6" rx="1" fill="#7A5A3E"/><rect x="-30" y="6" width="60" height="2" fill="#4A3424"/>
        <path d="M-22 -22 L22 -22 L27 -15 L-27 -15Z" fill="#3E5A58"/><path d="M-22 -22 L22 -22 L23 -20 L-23 -20Z" fill="#5A7A76"/>
        <rect x="-20" y="-15" width="2.5" height="15" fill="#3A2618"/><rect x="17.5" y="-15" width="2.5" height="15" fill="#3A2618"/>
        <rect x="-14" y="-14" width="28" height="12" fill="#CDB894"/><rect x="-8" y="-12" width="10" height="7" fill="#F4EFE4"/>
        <rect x="-5" y="-4" width="12" height="2.5" fill="#6B4A32"/>
        <rect x="26" y="-24" width="1.6" height="24" fill="#2E2A2C"/><circle cx="26.8" cy="-25" r="3" fill="#FFB65A"/>
        <g class="vm-label" transform="translate(0 30)"><text class="vm-n" text-anchor="middle">ESTAÇÃO</text><text class="vm-s" y="15" text-anchor="middle">駅 · CONTATO</text></g>
      </g>
      <g class="vm-place vm-moving" data-place="trem" tabindex="0" role="button" aria-label="Trem sobre a água: a galeria" id="vmTrain">
        <circle class="vm-halo" r="46"/>
        <g transform="translate(-50 -10)">
          ${[0, 34, 68].map((x) => `<g transform="translate(${x} 0)"><rect width="31" height="8" y="8" rx="1.5" fill="#7A2A26"/><rect width="31" height="8" rx="2" fill="#E8DCC2"/><path d="M0 1 Q15.5 -5 31 1 L31 2 L0 2Z" fill="#2E2A2C"/><g fill="#FFD58A"><rect x="3" y="2" width="5" height="4.5" rx="0.6"/><rect x="10" y="2" width="5" height="4.5" rx="0.6"/><rect x="17" y="2" width="5" height="4.5" rx="0.6"/><rect x="24" y="2" width="4" height="4.5" rx="0.6"/></g><circle cx="6" cy="17" r="2.2" fill="#2E2A2C"/><circle cx="25" cy="17" r="2.2" fill="#2E2A2C"/></g>`).join("")}
          <circle cx="100" cy="11" r="2" fill="#FFE9B0"/>
        </g>
        <g class="vm-label" transform="translate(0 30)"><text class="vm-n" text-anchor="middle">TREM · GALERIA</text><text class="vm-s" y="15" text-anchor="middle">汽 · LEMBRANÇAS</text></g>
      </g>
      <g class="vm-place vm-moving" data-place="castelo" tabindex="0" role="button" aria-label="Castelo do Howl: os projetos" id="vmCastle">
        <circle class="vm-halo" r="56" cy="-18"/>
        <ellipse cx="0" cy="34" rx="30" ry="5" fill="rgba(0,0,0,0.28)"/>
        <g fill="none" stroke="#A89CA6" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M-14 6 L-21 19 L-15 32 M-15 32 L-21 33 M-15 32 L-10 33"/><path d="M14 6 L21 19 L15 32 M15 32 L21 33 M15 32 L10 33"/>
        </g>
        <path d="M-40 4 C-47 -9 -40 -25 -27 -29 C-22 -40 -6 -45 6 -38 C18 -45 34 -36 36 -24 C46 -18 46 -2 36 6 C30 12 18 12 6 10 L-24 10 C-34 12 -42 10 -40 4Z" fill="#5E5660" stroke="#2A1E1A" stroke-width="1.6"/>
        <path d="M-36 -2 C-38 -14 -30 -24 -18 -26 C-10 -34 4 -36 12 -30 C2 -30 -8 -26 -14 -18 C-24 -16 -32 -10 -36 -2Z" fill="#7C7480"/>
        <g fill="none" stroke="#3E3640" stroke-width="0.9" opacity="0.8"><path d="M-30 -10 Q-20 -14 -10 -10"/><path d="M-6 -16 Q6 -20 18 -14"/><path d="M14 -2 Q24 -6 34 -2"/><path d="M-24 2 Q-12 -1 0 3"/></g>
        <g fill="#B0A8B2"><circle cx="-26" cy="-8" r="0.9"/><circle cx="-12" cy="-12" r="0.9"/><circle cx="4" cy="-18" r="0.9"/><circle cx="20" cy="-10" r="0.9"/><circle cx="28" cy="0" r="0.9"/></g>
        <rect x="-26" y="-44" width="11" height="10" fill="#D8C9A8" stroke="#2A1E1A" stroke-width="1"/><path d="M-28 -44 L-20.5 -51 L-13 -44Z" fill="#B8483A" stroke="#2A1E1A" stroke-width="1"/><rect x="-23" y="-41" width="3" height="3" fill="#FFC86A"/>
        <rect x="-6" y="-52" width="10" height="13" fill="#CFC0A0" stroke="#2A1E1A" stroke-width="1"/><path d="M-8 -52 L-1 -60 L6 -52Z" fill="#4E6E96" stroke="#2A1E1A" stroke-width="1"/><rect x="-3" y="-48" width="3" height="3" fill="#FFC86A"/>
        <rect x="12" y="-47" width="7" height="12" fill="#BDB0A0" stroke="#2A1E1A" stroke-width="1"/><path d="M11 -47 L15.5 -58 L20 -47Z" fill="#B8483A" stroke="#2A1E1A" stroke-width="1"/>
        <rect x="24" y="-38" width="4" height="10" fill="#3A3236"/><rect x="-34" y="-30" width="4" height="9" fill="#3A3236"/>
        <g fill="#D8D4D0" opacity="0.75"><circle cx="26" cy="-44" r="3.2"/><circle cx="29" cy="-51" r="4.2"/><circle cx="25" cy="-59" r="5"/><circle cx="-32" cy="-36" r="2.6"/><circle cx="-35" cy="-42" r="3.4"/></g>
        <path d="M-44 -4 L-54 -6 L-54 0 L-44 1Z" fill="#3A3236" stroke="#2A1E1A" stroke-width="1"/>
        <ellipse cx="-30" cy="2" rx="6" ry="3.4" fill="#1A1416"/><circle cx="-14" cy="-4" r="3.6" fill="#FFB65A" stroke="#2A1E1A" stroke-width="1"/>
        <g class="vm-label" transform="translate(0 -74)"><text class="vm-n" text-anchor="middle">CASTELO DO HOWL · PROJETOS</text><text class="vm-s" y="15" text-anchor="middle">城 · ENTRA-SE PELOS FUNDOS</text></g>
      </g>

      <g transform="translate(64 540)" class="vm-compass"><circle r="22" fill="none" stroke="#EFE6D2" stroke-width="1.4" opacity="0.8"/><path d="M0 -30 L6 0 L0 30 L-6 0Z" fill="#EFE6D2" opacity="0.9"/><path d="M0 -30 L6 0 L-6 0Z" fill="#C22026"/><text y="-38" text-anchor="middle" class="vm-k">北</text></g>
      <g transform="translate(870 590)"><line x1="0" x2="80" stroke="#EFE6D2" stroke-width="1.4" opacity="0.7"/><line x1="0" x2="0" y1="-4" y2="4" stroke="#EFE6D2"/><line x1="80" x2="80" y1="-4" y2="4" stroke="#EFE6D2"/><text x="40" y="-8" text-anchor="middle" class="vm-s">一 里</text></g>
      <rect width="1000" height="620" fill="url(#vmVig)" pointer-events="none"/>
    </svg>`;
    const el = document.createElement("div");
    el.className = "vmap"; el.id = "valeMap"; el.hidden = true;
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "false"); el.setAttribute("aria-label", "Mapa do vale");
    el.innerHTML = `<div class="vm-panel">
        <div class="vm-head"><span class="vm-title"><b aria-hidden="true">地図</b>Mapa do vale</span><span class="vm-hint">Toque num lugar para viajar até ele</span><button type="button" class="vm-close" aria-label="Fechar o mapa">&times;</button></div>
        ${svg}
        <div class="vm-foot"><button type="button" class="vm-explore">Explorar o vale em 3D</button></div>
      </div>`;
    exploreEl.appendChild(el);
    const trainG = el.querySelector("#vmTrain"), castleG = el.querySelector("#vmCastle");
    const close = () => { el.classList.remove("open"); setTimeout(() => { if (!el.classList.contains("open")) el.hidden = true; }, 380); exploreEl.classList.remove("map-on"); };
    const openM = () => { el.hidden = false; requestAnimationFrame(() => el.classList.add("open")); exploreEl.classList.add("map-on"); showCard(null); };
    el.querySelectorAll(".vm-place").forEach((g) => {
      const act = () => {
        close();
        if (g.dataset.world) { if (window.mundos) window.mundos.open(g.dataset.world); return; }
        go(g.dataset.place);
      };
      g.addEventListener("click", act);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } });
    });
    el.querySelector(".vm-close").addEventListener("click", close);
    el.querySelector(".vm-explore").addEventListener("click", () => { close(); go(null); });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && el.classList.contains("open")) close(); });
    return {
      open: openM, close, isOpen: () => el.classList.contains("open"),
      update() {
        if (el.hidden) return;
        const tx = Math.max(-136, Math.min(136, train.position.x));
        trainG.setAttribute("transform", `translate(${f(X(tx))} ${f(Y(TRACK_Z))})`);
        trainG.style.opacity = Math.abs(train.position.x) > 138 ? "0.25" : "1";
        castleG.setAttribute("transform", `translate(${f(X(castle.position.x))} ${f(Y(castle.position.z))})`);
      },
    };
  })();

  function camState() { return { pos: camera.position.clone(), tgt: lastTgt.clone() }; }
  function showCard(id) {
    const card = $("placeCard");
    if (!id) { card.hidden = true; return; }
    const P = PLACES[id];
    $("pcKicker").textContent = P.kicker;
    $("pcTitle").innerHTML = `<span aria-hidden="true">${P.k}</span>${P.name}`;
    $("pcText").textContent = P.text;
    $("placeCard").classList.toggle("is-footer", !!P.footer);
    const foot = $("pcFooter");
    if (foot) { foot.hidden = !P.footer; if (P.footer) fillFooter(foot); }
    const box = $("pcActions"); box.innerHTML = ""; box.classList.toggle("doors", P.actions.some((a) => a.door));
    P.actions.forEach((a) => {
      const b = document.createElement(a.href ? "a" : "button");
      b.className = "pc-btn" + (a.primary ? " primary" : "") + (a.door ? " door" : "") + (a.stair ? " stair" : "");
      if (a.door) b.style.setProperty("--door", a.door);
      b.innerHTML = a.sub ? `<b>${a.label}</b><small>${a.sub}</small>` : a.label;
      if (a.href) { b.href = a.href; b.target = "_blank"; b.rel = "noreferrer"; } else { b.type = "button"; b.addEventListener("click", a.run); }
      box.appendChild(b);
    });
    card.hidden = false;
  }
  // o rodapé reaproveita os dados do perfil (fonte única)
  function fillFooter(foot) {
    if (foot.dataset.ready) return;
    const mailEl = document.getElementById("perfilMail");
    const mail = mailEl ? mailEl.textContent.trim() : "";
    const links = [...document.querySelectorAll(".perfil .links a")];
    const places = [["castelo", "城", "Castelo"], ["torre", "塔", "Torre"], ["trem", "汽", "Trem"], ["torii", "門", "Torii"]];
    foot.innerHTML = `
      <div class="pf-col"><h3>連絡 · Contato</h3>${mail ? `<p class="pf-mail">${mail}</p><button type="button" class="pc-btn" data-copy>Copiar e-mail</button>` : ""}</div>
      <div class="pf-col"><h3>網 · Redes</h3><ul class="pf-links"></ul></div>
      <div class="pf-col"><h3>地図 · Lugares</h3><ul class="pf-places"></ul></div>
      <p class="pf-credits">© 2026 Fernando Rateke. Vale feito à mão com Three.js. Homenagem ao Studio Ghibli: personagens e castelo pertencem aos seus autores. Músicas: Joe Hisaishi, Evan Call e Claude Debussy.</p>`;
    const ul = foot.querySelector(".pf-links");
    links.forEach((a) => { const li = document.createElement("li"); const c = a.cloneNode(true); c.className = ""; li.appendChild(c); ul.appendChild(li); });
    const pl = foot.querySelector(".pf-places");
    places.forEach(([id, k, n]) => { const li = document.createElement("li"); const b = document.createElement("button"); b.type = "button"; b.innerHTML = `<b aria-hidden="true">${k}</b>${n}`; b.addEventListener("click", () => go(id)); li.appendChild(b); pl.appendChild(li); });
    const li = document.createElement("li"); const pb = document.createElement("button"); pb.type = "button"; pb.innerHTML = `<b aria-hidden="true">印</b>Perfil`;
    pb.addEventListener("click", () => { const f = document.getElementById("sealFab"); if (f) f.click(); }); li.appendChild(pb); pl.appendChild(li);
    const cp = foot.querySelector("[data-copy]");
    if (cp) cp.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(mail); cp.textContent = "E-mail copiado"; } catch (e) { cp.textContent = mail; }
      setTimeout(() => { cp.textContent = "Copiar e-mail"; }, 2200);
    });
    foot.dataset.ready = "1";
  }
  function go(id) {
    explore.from = camState(); explore.k = 0; explore.place = id;
    showCard(id);
    Object.entries(explore.markers).forEach(([key, el]) => el.classList.toggle("on", key.replace("-mm", "") === id));
  }
  function startExplore(withMap) {
    explore.active = true; explore.place = null; explore.from = camState(); explore.k = 0;
    exploreEl.hidden = false; hero.classList.add("exploring");
    showCard(null);
    window.dispatchEvent(new CustomEvent("vale:explore", { detail: "start" }));
    setRunning(true);
    if (withMap && vmap) vmap.open();
  }
  function exitExplore(toCover) {
    if (vmap) vmap.close();
    explore.active = false; exploreEl.hidden = true; hero.classList.remove("exploring");
    showCard(null);
    if (toCover) { explore.coverFrom = camState(); explore.coverK = 0; }
    window.dispatchEvent(new CustomEvent("vale:explore", { detail: "end" }));
  }
  function exploreStep(dt, tdt = dt) {
    tpStep(tdt);
    if (vmap) vmap.update();
    const P = explore.place ? PLACES[explore.place] : null;
    const v = P ? P.view() : { pos: OVERVIEW.pos.clone().add(new T.Vector3(Math.sin(clock * 0.05) * 6, 0, 0)), tgt: OVERVIEW.tgt.clone() };
    explore.k = Math.min(1, explore.k + tdt / 2.3);
    const e = ease(explore.k);
    const pos = explore.from ? explore.from.pos.clone().lerp(v.pos, e) : v.pos;
    const tgt = explore.from ? explore.from.tgt.clone().lerp(v.tgt, e) : v.tgt;
    pos.x += pointer.sx * (P ? 1.2 : 3) * e; pos.y += -pointer.sy * (P ? 0.5 : 2) * e;
    place(pos, tgt);
    // marcadores e pontos do minimapa acompanham a cena
    const W2 = canvas.clientWidth, H2 = canvas.clientHeight;
    Object.entries(PLACES).forEach(([id, Pl]) => {
      const el = explore.markers[id]; const p = Pl.anchor().project(camera);
      const vis = p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1;
      el.style.transform = `translate(-50%, -100%) translate(${((p.x * 0.5 + 0.5) * W2).toFixed(1)}px, ${((-p.y * 0.5 + 0.5) * H2).toFixed(1)}px)`;
      el.style.opacity = vis ? "1" : "0"; el.tabIndex = vis ? 0 : -1;
    });
    const cpos = { torii: [TORII.x, TORII.z], castelo: [castle.position.x, castle.position.z], torre: [TOWER.x, TOWER.z], trem: [Math.max(-128, Math.min(128, train.position.x)), TRACK_Z], estacao: [STATION.x, STATION.z] };
    Object.entries(cpos).forEach(([id, [x, z]]) => {
      const d = explore.markers[id + "-mm"]; d.style.left = `${(explore.mm.mx(x) / 200 * 100).toFixed(2)}%`; d.style.top = `${(explore.mm.mz(z) / 130 * 100).toFixed(2)}%`;
    });
  }

  let running = false, visible = true, last = performance.now(), clock = 30;
  // no máximo 60 quadros por segundo; com o mapa ou o perfil cobrindo a cena, bem menos
  const covered = () => (vmap && vmap.isOpen()) || root.classList.contains("perfil-on");
  function frame(now) {
    const minGap = covered() ? 1000 / 20 : 1000 / 60 - 1.5;
    if (now - last < minGap) { if (running) requestAnimationFrame(frame); return; }
    const raw = Math.max(0, (now - last) / 1000); last = now;
    if (!covered() && raw < 0.25) measure(raw * 1000);
    const dt = Math.min(0.05, raw), tdt = Math.min(0.25, raw); // tdt: transições seguem o relógio real
    clock += dt;
    if (intro.active) {
      U.uDusk.value += (duskTarget - U.uDusk.value) * Math.min(1, dt * 2.2);
      updateWorld(clock);
      introStep(dt);
    } else if (explore.active) {
      U.uNight.value += (nightTarget - U.uNight.value) * Math.min(1, dt * 2.2);
      U.uDusk.value += (duskTarget - U.uDusk.value) * Math.min(1, dt * 2.2);
      pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 1.6);
      pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 1.6);
      updateWorld(clock);
      exploreStep(dt, tdt);
    } else {
      U.uNight.value += (nightTarget - U.uNight.value) * Math.min(1, dt * 2.2);
      U.uDusk.value += (duskTarget - U.uDusk.value) * Math.min(1, dt * 2.2);
      pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 1.6);
      pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 1.6);
      updateWorld(clock);
      const p = BASE.pos.clone();
      p.x += pointer.sx * 1.4 + Math.sin(clock * 0.07) * 0.6;
      p.y += -pointer.sy * 0.45 + Math.sin(clock * 0.11) * 0.08;
      if (explore.coverK < 1) {
        explore.coverK = Math.min(1, explore.coverK + tdt / 2.4);
        const e = ease(explore.coverK);
        place(explore.coverFrom.pos.clone().lerp(p, e), explore.coverFrom.tgt.clone().lerp(BASE.target, e));
      } else if (peekCam) place(peekCam.p, peekCam.t); else place(p, BASE.target);
    }
    render();
    if (running) requestAnimationFrame(frame);
  }
  function setRunning(on) {
    if (reduce && !intro.active) return;
    if (on && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    if (!on && !intro.active) running = false;
  }

  function start() {
    applyQuality();
    if (plaque) plaque.userData.redraw();
    signRedraws.forEach((f) => f());
    captureFrames();
    U.uNight.value = nightTarget; U.uDusk.value = duskTarget;
    if (reduce) { updateWorld(clock); place(BASE.pos, BASE.target); render(); }
    else setRunning(true);
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; setRunning(visible && !document.hidden); }).observe(canvas);
    document.addEventListener("visibilitychange", () => setRunning(visible && !document.hidden));
    let rt2; addEventListener("resize", () => { clearTimeout(rt2); rt2 = setTimeout(() => { resize(); if (reduce || !running) { place(BASE.pos, BASE.target); render(); } }, 150); });
    if (reduce) {
      new MutationObserver(() => { U.uNight.value = wantNight(); U.uDusk.value = wantDusk(); render(); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    }
    canvas.classList.add("ready");
    // pausa o vale enquanto um mundo de destaque está aberto
    window.addEventListener("mundo", (e) => { if (e.detail === "open") running = false; else setRunning(visible && !document.hidden); });
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
})();
