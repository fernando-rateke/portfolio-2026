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
    uniform float uTime; uniform float uNight; uniform float uReflect; uniform float uHaze;
    uniform vec3 uSun; uniform vec3 uFogDay; uniform vec3 uFogNight; uniform float uFogDensity;
    uniform vec3 uLanterns[2];
    vec3 fogColor(){ return mix(uFogDay,uFogNight,uNight); }
    vec3 applyFog(vec3 col, vec3 w){
      float d=length(w-cameraPosition);
      float f=1.0-exp(-pow(d*uFogDensity,1.35));
      col=mix(col,fogColor(),clamp(f,0.0,0.94));
      return mix(col, mix(vec3(0.93,0.95,0.97),vec3(0.20,0.25,0.36),uNight), uHaze);
    }
    vec3 lanternGlow(vec3 w){
      vec3 g=vec3(0.0);
      for(int i=0;i<2;i++){ float d=length(w-uLanterns[i]); g+=vec3(1.0,0.62,0.25)*(0.55/(1.0+d*d*0.35)); }
      return g;
    }
    vec3 nightTint(vec3 c){ return c*vec3(0.20,0.27,0.40)+vec3(0.012,0.018,0.035); }
  `;
  const col = (h) => new T.Color(h);

  const U = {
    uTime: { value: 0 }, uNight: { value: 0 }, uReflect: { value: 0 }, uHaze: { value: 0 },
    uSun: { value: new T.Vector3(-0.35, 0.78, 0.52).normalize() },
    uFogDay: { value: col("#C4DDE8") }, uFogNight: { value: col("#1A2943") },
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
  const sky = new T.Mesh(new T.SphereGeometry(1800, 48, 24), mat(
    `varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    `${COMMON}
     uniform vec3 uZenD, uHorD, uZenN, uHorN, uMoon; varying vec3 vDir;
     float hash(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
     void main(){
       vec3 d=normalize(vDir); float y=d.y;
       vec3 day=mix(uHorD,uZenD,smoothstep(-0.02,0.5,y));
       day+=vec3(0.16,0.14,0.09)*pow(max(dot(d,normalize(vec3(0.55,0.42,-0.72))),0.0),5.0);
       vec3 night=mix(uHorN,uZenN,smoothstep(-0.02,0.55,y));
       vec3 cell=floor(d*380.0); float h=hash(cell);
       float star=step(0.9972,h)*smoothstep(0.02,0.18,y);
       night+=vec3(0.85,0.9,1.0)*star*(0.55+0.45*sin(uTime*1.7+h*91.0));
       float md=dot(d,uMoon);
       float disc=smoothstep(0.99935,0.9996,md);
       float bite=smoothstep(0.99935,0.9996,dot(d,normalize(uMoon+vec3(0.011,0.008,0.004))));
       night+=vec3(0.93,0.94,0.9)*disc*(1.0-bite*0.96)+vec3(0.22,0.28,0.42)*pow(max(md,0.0),420.0)*0.7;
       vec3 c=mix(day,night,uNight);
       c=mix(c, mix(vec3(0.93,0.95,0.97),vec3(0.2,0.25,0.36),uNight), uHaze);
       gl_FragColor=vec4(c,1.0);
     }`,
    { uZenD: { value: col("#2468AA") }, uHorD: { value: col("#BCDBEA") }, uZenN: { value: col("#040914") }, uHorN: { value: col("#1C2D4C") }, uMoon: { value: new T.Vector3(0.42, 0.36, -0.83).normalize() } },
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
      vec3 rock=mix(uRockD,uRock,smoothstep(0.18,0.34,ndl));
      vec3 sn=mix(uSnowS,uSnow,smoothstep(0.22,0.36,ndl));
      float line=uSnowLine+snoise(vW.xz*0.035)*9.0;
      float snow=smoothstep(line-3.0,line+3.0,vW.y)*smoothstep(0.32,0.55,n.y);
      snow=max(snow, smoothstep(line+10.0,line+16.0,vW.y)*0.85);
      vec3 c=mix(rock,sn,snow);
      c=mix(uLow*mix(0.82,1.0,smoothstep(0.2,0.4,ndl)),c,smoothstep(3.0,18.0,vW.y));
      c=mix(c,nightTint(c)*1.15,uNight);
      float d=length(vW-cameraPosition);
      c=mix(c,fogColor(),clamp(0.14+(d-200.0)/900.0,0.0,0.62));
      c=mix(c, mix(vec3(0.93,0.95,0.97),vec3(0.2,0.25,0.36),uNight), uHaze);
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
      uniform vec3 uShD, uMidD, uLitD, uShN, uMidN, uLitN; varying vec3 vW; varying vec3 vN; varying float vBase; varying float vHt;
      void main(){
        if(vW.y < vBase + snoise(vW.xz*0.06)*2.2) discard;
        vec3 n=normalize(vN+0.13*vec3(snoise(vW.yz*0.028),snoise(vW.xz*0.028),snoise(vW.xy*0.028)));
        float hf=clamp((vW.y-vBase)/vHt,0.0,1.0);
        float v=(dot(n,uSun)*0.5+0.5)*0.7+hf*0.44;
        vec3 sh=mix(uShD,uShN,uNight), md=mix(uMidD,uMidN,uNight), lt=mix(uLitD,uLitN,uNight);
        vec3 c=mix(sh,md,smoothstep(0.46,0.6,v));
        c=mix(c,lt,smoothstep(0.66,0.8,v));
        vec3 V=normalize(cameraPosition-vW);
        c+=vec3(0.06,0.06,0.05)*(1.0-uNight)*smoothstep(0.55,0.95,1.0-abs(dot(normalize(vN),V)));
        c*=mix(0.84,1.0,smoothstep(0.0,0.16,hf));
        float d=length(vW-cameraPosition);
        c=mix(c,fogColor(),clamp((d-250.0)/1400.0,0.0,0.35));
        c=mix(c, mix(vec3(0.93,0.95,0.97),vec3(0.2,0.25,0.36),uNight), uHaze);
        gl_FragColor=vec4(c,1.0);
      }`,
      { uShD: { value: col("#93ABC2") }, uMidD: { value: col("#D7E2EB") }, uLitD: { value: col("#FFFDF6") },
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
      c=mix(c,vec3(1.0,0.72,0.36)*1.15,vGlow*uNight);
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
  /* Árvores em estilo Ghibli (copas de bolhas)                          */
  /* ------------------------------------------------------------------ */
  {
    const B = Builder(); const r = mulberry(31);
    const spots = [[-38, -58], [-44, -62], [-33, -66], [-92, -84], [-86, -90], [52, -62], [60, -58], [57, -70], [118, -104], [-150, -170], [-160, -164], [26, -150], [-20, -200], [160, -220]];
    const greens = ["#3F6E44", "#4C7C4A", "#5A8C50"];
    for (const [x, z] of spots) {
      const y = heightAt(x, z); if (y < 0.3) continue;
      const s = 0.9 + r() * 0.8;
      B.add(new T.CylinderGeometry(0.18 * s, 0.3 * s, 3.2 * s, 7), M(x, y + 1.5 * s, z), "#5B4636");
      const n = 6 + Math.floor(r() * 5);
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, rad = (0.6 + r() * 1.1) * s;
        const py = y + (3.0 + r() * 2.4) * s;
        const pr = (1.0 + r() * 0.9) * s;
        B.add(new T.IcosahedronGeometry(pr, 2), M(x + Math.cos(a) * rad, py, z + Math.sin(a) * rad * 0.8), greens[i % 3], 0, 1);
      }
    }
    scene.add(new T.Mesh(B.build(), objMat));
  }

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
    const RUST = ["#8C5B43", "#7A4D3B", "#9B6A4B", "#6E5246", "#A07052"];
    const METAL = "#4D4848", METAL_D = "#383333", WOOD = "#7B5A3E", CANVAS = "#C4B49A", COPPER = "#6F8D7E", SLATE = "#6E7C86";
    const WALL = ["#ECE2CF", "#E2D3B8", "#D9CDB6"], ROOF = ["#A8473A", "#8E3C33", "#5E6B76", "#7C4A3A"];

    // Casco: massas sobrepostas, como uma sucata que virou casa
    [[0, 9.6, 0, 6.4, 4.0, 4.8, RUST[0]], [-3.4, 10.4, 0.3, 4.8, 3.8, 4.2, RUST[1]], [3.8, 10.2, 0, 3.6, 3.3, 3.6, RUST[2]],
     [-0.6, 12.8, 0.4, 4.4, 2.8, 3.6, RUST[3]], [1.6, 7.6, 0, 4.6, 2.2, 3.8, RUST[4]]]
      .forEach(([x, y, z, sx, sy, sz, c]) => B.add(new T.SphereGeometry(1, 28, 18), M(x, y, z, 0, 0, 0, sx, sy, sz), c));
    // Placas de metal remendadas
    for (let i = 0; i < 28; i++) {
      const a = r() * Math.PI * 2, y = 7.2 + r() * 6.5;
      const rad = 4.7 - Math.abs(y - 10) * 0.28;
      B.add(new T.BoxGeometry(1.6 + r(), 1.0 + r() * 0.8, 0.22), M(Math.cos(a) * rad * 1.28, y, Math.sin(a) * rad, (r() - 0.5) * 0.3, -a + Math.PI / 2, (r() - 0.5) * 0.3), RUST[(i + 2) % 5]);
    }
    // Rebites no cinturão do casco
    for (let i = 0; i < 52; i++) { const a = i / 52 * Math.PI * 2; B.add(new T.SphereGeometry(0.13, 6, 4), M(Math.cos(a) * 6.32, 9.2 + Math.sin(a * 3) * 0.25, Math.sin(a) * 4.74), METAL_D); }

    // Rosto: olhos-canhão, boca com dentes e a plataforma de madeira
    for (const z of [-1.5, 1.5]) {
      B.add(new T.CylinderGeometry(0.62, 0.72, 1.8, 16), M(7.0, 11.2, z, 0, 0, -Math.PI / 2), METAL);
      B.add(new T.TorusGeometry(0.66, 0.12, 8, 18), M(7.9, 11.2, z, 0, Math.PI / 2, 0), METAL_D);
      B.add(new T.CircleGeometry(0.5, 16), M(7.93, 11.2, z, 0, Math.PI / 2, 0), "#1B1615");
    }
    B.add(new T.BoxGeometry(1.2, 1.1, 3.6), M(6.6, 8.6, 0), "#2A201D");
    for (let i = 0; i < 6; i++) B.add(new T.BoxGeometry(0.5, 0.5, 0.42), M(7.1, 9.05, -1.4 + i * 0.56, 0, 0, 0.1), "#D9D1C0");
    B.add(new T.BoxGeometry(2.8, 0.28, 1.8), M(7.9, 8.1, 0, 0, 0, -0.12), WOOD);
    B.add(new T.BoxGeometry(0.1, 0.9, 1.8), M(9.25, 8.4, 0), WOOD);

    // Cúpulas do alto
    [[0.2, 14.6, 0.2, 3.0, 2.3, 2.8, RUST[2]], [-2.9, 14.9, 1.2, 2.0, 2.2, 1.9, SLATE], [2.6, 15.2, -1.2, 1.9, 2.0, 1.9, COPPER]]
      .forEach(([x, y, z, sx, sy, sz, c]) => B.add(new T.SphereGeometry(1, 24, 14), M(x, y, z, 0, 0, 0, sx, sy, sz), c));

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
    [[-3.6, 12.6, 2.6, 1.8, 1.3, 1.5, 0.3], [3.9, 12.3, 2.0, 1.6, 1.2, 1.4, -0.2], [0.6, 16.2, 1.8, 1.7, 1.2, 1.4, 0.1],
     [-2.2, 16.4, -1.0, 1.4, 1.1, 1.2, 0.6], [2.8, 16.8, 0.8, 1.3, 1.0, 1.1, -0.4], [-4.8, 9.6, 3.4, 1.6, 1.3, 1.3, 0.7],
     [4.8, 9.0, 2.9, 1.4, 1.2, 1.2, -0.6], [1.6, 11.6, 4.2, 1.6, 1.2, 1.2, 0.0], [-1.4, 11.2, 4.1, 1.5, 1.1, 1.2, 0.15],
     [-5.2, 12.0, -2.4, 1.6, 1.2, 1.4, 2.6], [1.2, 12.4, -4.0, 1.7, 1.2, 1.3, 3.1], [4.2, 13.4, -2.6, 1.3, 1.1, 1.1, 2.8]]
      .forEach(([x, y, z, w, h, d, ry], i) => house(x, y, z, w, h, d, ry, WALL[i % 3], ROOF[i % 4]));

    // Chaminés, algumas tortas
    [[-1.2, 15.8, -0.8, 4.2, 0.05], [1.0, 16.4, -1.4, 5.0, -0.06], [3.6, 15.0, -1.8, 3.2, -0.12], [-3.6, 15.6, 0.0, 3.0, 0.1],
     [-4.8, 13.2, -1.6, 2.6, 0.18], [0.4, 15.4, 2.2, 2.4, 0.0], [4.8, 13.4, 1.4, 2.2, -0.2]].forEach(([x, y, z, h, lean]) => {
      const Mc = M(x, y, z, 0, 0, lean);
      B.add(new T.CylinderGeometry(0.36, 0.46, h, 12), Mc, METAL);
      B.add(new T.CylinderGeometry(0.5, 0.42, 0.3, 12), Mc.clone().multiply(M(0, h / 2, 0)), METAL_D);
      chimneyTops.push(new T.Vector3(0, h / 2 + 0.35, 0).applyMatrix4(Mc));
    });

    // Torres com cone e mastro
    const turret = (x, y, z, rr, h, roof) => {
      B.add(new T.CylinderGeometry(rr, rr * 1.08, h, 14), M(x, y, z), WALL[0]);
      B.add(new T.ConeGeometry(rr * 1.35, h * 0.62, 14), M(x, y + h / 2 + h * 0.31, z), roof);
      B.add(new T.CylinderGeometry(0.05, 0.05, 1.6, 5), M(x, y + h / 2 + h * 0.62 + 0.6, z), METAL_D);
      B.add(new T.PlaneGeometry(0.24, 0.36), M(x, y + h * 0.1, z + rr + 0.02), "#2D2624", 1);
      B.add(new T.PlaneGeometry(0.24, 0.36), M(x + rr + 0.02, y + h * 0.1, z, 0, Math.PI / 2, 0), "#2D2624", 1);
    };
    turret(-0.6, 17.6, 0.4, 0.95, 3.6, ROOF[0]);
    turret(3.0, 17.4, 1.6, 0.6, 2.4, ROOF[2]);
    turret(-3.4, 17.2, -1.4, 0.55, 2.0, ROOF[1]);

    // Canos
    const pipe = (pts, rad, c) => B.add(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map((q) => new T.Vector3(...q))), 40, rad, 8), M(), c);
    pipe([[5.2, 8.0, 3.0], [4.4, 10.0, 4.4], [2.0, 11.5, 4.6], [0.0, 12.5, 3.6]], 0.2, COPPER);
    pipe([[-5.6, 9.0, -2.6], [-6.4, 11.0, -1.0], [-5.8, 13.0, 0.8], [-4.2, 14.4, 1.2]], 0.18, METAL);
    pipe([[3.0, 13.2, 3.0], [4.4, 14.0, 2.4], [5.2, 13.0, 1.0]], 0.14, METAL_D);
    pipe([[-2.0, 7.0, -3.8], [-4.0, 8.2, -3.6], [-5.6, 10.6, -2.4]], 0.16, COPPER);

    // Velas de lona na traseira e a sucata da cauda
    for (const z of [-1, 1]) {
      B.add(new T.BoxGeometry(3.4, 2.6, 0.08), M(-7.2, 11.0, z * 2.6, 0, z * 0.5, 0.15), CANVAS);
      for (let k = 0; k < 4; k++) B.add(new T.CylinderGeometry(0.05, 0.05, 2.8, 4), M(-8.4 + k * 0.8, 11.0, z * 2.6, 0, z * 0.5, 0.15), WOOD);
    }
    for (let i = 0; i < 7; i++) B.add(new T.BoxGeometry(1 + r(), 0.8 + r() * 0.6, 1 + r()), M(-6.2 + r() * 1.2, 7.4 + r() * 2.2, (r() - 0.5) * 3.6, 0, r(), 0), i % 2 ? WOOD : RUST[3]);

    const bodyGeo = B.build();
    castleBody.add(new T.Mesh(bodyGeo, objMat));
    castleBody.add(new T.Mesh(bodyGeo, castleLine));

    // Pernas de ave com joelho invertido e pés de três dedos
    const LEG = "#3E3634";
    const thighGeo = (() => { const b = Builder();
      b.add(new T.CylinderGeometry(0.34, 0.26, 3.6, 10), M(0, -1.8, 0), LEG);
      b.add(new T.SphereGeometry(0.52, 12, 8), M(0, 0, 0), METAL_D);
      b.add(new T.SphereGeometry(0.4, 12, 8), M(0, -3.6, 0), METAL_D);
      return b.build(); })();
    const shinGeo = (() => { const b = Builder();
      b.add(new T.CylinderGeometry(0.22, 0.18, 3.8, 10), M(0, -1.9, 0), LEG);
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
      fragmentShader: `uniform float uNight; varying float vAge; void main(){ vec2 p=gl_PointCoord-0.5; float d=length(p); if(d>0.5) discard; float a=smoothstep(0.5,0.12,d)*(1.0-vAge)*0.5; vec3 c=mix(mix(vec3(0.97,0.97,0.95),vec3(0.8,0.82,0.84),vAge),vec3(0.24,0.27,0.34),uNight); gl_FragColor=vec4(c,a); }`,
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
    const coat = folds(lathe([[0.292, 0.46], [0.27, 0.66], [0.215, 0.92], [0.168, 1.04], [0.172, 1.24], [0.205, 1.39], [0.15, 1.5], [0.07, 1.545]], 64, 0, Math.PI * 2, 7),
      11, (y) => 0.055 * smooth(1.0, 0.46, y), 0.7);
    tb.add(coat, M(), harlequin, 0, (j, p) => smooth(0.98, 0.46, p.getY(j)) * 1.3);
    tb.add(new T.TorusGeometry(0.29, 0.014, 6, 48), M(0, 0.47, 0, Math.PI / 2, 0, 0), GOLD, 0, 1.3);
    // abertura das costas: duas abas que se separam com o vento
    tb.add(new T.BoxGeometry(0.012, 0.36, 0.006), M(0, 0.66, 0.268, -0.15, 0, 0), SEAM, 0, (j, p) => smooth(0.18, -0.18, p.getY(j)) * 1.3);
    // gola alta
    tb.add(lathe([[0.075, 1.5], [0.088, 1.56], [0.095, 1.6]], 28), M(), "#4F6E96");
    tb.add(new T.TorusGeometry(0.072, 0.02, 8, 20), M(0, 1.53, 0, Math.PI / 2, 0, 0), "#F4F0E6");
    // bolso onde a mão direita se esconde
    tb.add(new T.BoxGeometry(0.11, 0.07, 0.03), M(0.2, 0.86, -0.06, 0, -0.6, -0.15), PINK);
    part(torso, tb.build());
    const armsH = [-1, 1].map((sx) => {
      const sh = joint(torso, sx * 0.208, 1.43, 0);
      const b = Builder();
      b.add(folds(lathe([[0.05, -0.52], [0.06, -0.4], [0.06, -0.15], [0.064, 0.0], [0.05, 0.05]], 20, 0, Math.PI * 2, 3), 6, (y) => 0.06), M(), harlequin);
      b.add(new T.TorusGeometry(0.052, 0.012, 6, 18), M(0, -0.5, 0, Math.PI / 2, 0, 0), GOLD);
      if (sx < 0) hand(b, M(0, -0.56, 0), SKIN, sx);
      part(sh, b.build()); return sh;
    });
    const head = joint(torso, 0, 1.58, 0);
    const hb = Builder();
    hb.add(new T.CylinderGeometry(0.044, 0.05, 0.12, 12), M(0, -0.02, 0), SKIN);
    hb.add(new T.SphereGeometry(0.11, 22, 16), M(0, 0.125, 0, 0, 0, 0, 0.96, 1.1, 1.02), SKIN);
    ear(hb, -0.103, 0.11, 0.0); ear(hb, 0.103, 0.11, 0.0);
    hb.add(new T.SphereGeometry(0.114, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), M(0, 0.135, 0.008, 0, 0, 0, 1.0, 1.08, 1.06), HAIR_D);
    part(head, hb.build());
    const hair = Builder();
    hairdo(hair, {
      seed: 8, center: [0, 0.135, 0.008], R: 0.116, w: 0.032, th: 0.012, sway: 0.9, puff: 0.12,
      base: HAIR, dark: HAIR_D, light: HAIR_L, shine: [0.16, 0.27],
      groups: [
        { n: 30, a: [0.02, 0.98], root: [0.05, 0.4], end: 1.78, len: [0.07, 0.15], out: 0.035, curl: 0.3 },     // nuca e costas
        { n: 10, a: [-0.12, 0.12], root: [0.1, 0.4], end: 1.62, len: [0.06, 0.12], out: 0.03, curl: 0.2 },      // lateral direita
        { n: 10, a: [0.88, 1.12], root: [0.1, 0.4], end: 1.62, len: [0.06, 0.12], out: 0.03, curl: 0.2 },       // lateral esquerda
        { n: 12, a: [1.15, 1.85], root: [0.05, 0.3], end: 1.18, len: [0.02, 0.05], out: 0.02, curl: 0.5, shine: false }, // franja
      ],
    });
    bare(head, hair.build());
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
      lb.add(new T.CapsuleGeometry(0.043, 0.22, 4, 8), M(sx * 0.07, 0.17, 0), "#6B5545");
      lb.add(new T.CapsuleGeometry(0.05, 0.08, 4, 10), M(sx * 0.07, 0.04, -0.035, -Math.PI / 2, 0, 0), "#4A3426");
    }
    part(g, lb.build());
    const torso = new T.Group(); g.add(torso);
    const tb = Builder();
    const dress = folds(lathe([[0.29, 0.27], [0.255, 0.5], [0.18, 0.82], [0.12, 0.97], [0.13, 1.12], [0.155, 1.23], [0.1, 1.31], [0.05, 1.33]], 56, 0, Math.PI * 2, 5),
      14, (y) => 0.065 * smooth(0.95, 0.27, y), 1.3);
    tb.add(dress, M(), (x, y) => (y < 0.33 ? DRESS_D : DRESS), 0, (j, p) => smooth(0.85, 0.27, p.getY(j)) * 1.2);
    // mangas bufantes
    for (const sx of [-1, 1]) tb.add(new T.SphereGeometry(1, 14, 10), M(sx * 0.16, 1.22, 0, 0, 0, 0, 0.058, 0.05, 0.06), DRESS);
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
      const sh = joint(torso, sx * 0.165, 1.21, 0);
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
    hb.add(new T.SphereGeometry(0.103, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), M(0, 0.118, 0.006, 0, 0, 0, 1.0, 1.06, 1.06), HAIR_D);
    part(head, hb.build());
    const hair = Builder();
    hairdo(hair, {
      seed: 15, center: [0, 0.118, 0.006], R: 0.104, w: 0.03, th: 0.012, sway: 0.6, puff: 0.2,
      base: HAIR, dark: HAIR_D, light: HAIR_L, shine: [0.14, 0.26],
      groups: [
        { n: 34, a: [0.0, 1.0], root: [0.04, 0.4], end: 1.95, len: [0.02, 0.045], out: 0.012, curl: 1.6 },    // chanel, pontas para dentro
        { n: 10, a: [-0.18, 0.05], root: [0.1, 0.45], end: 1.75, len: [0.02, 0.04], out: 0.01, curl: 1.4 },
        { n: 10, a: [0.95, 1.18], root: [0.1, 0.45], end: 1.75, len: [0.02, 0.04], out: 0.01, curl: 1.4 },
        { n: 12, a: [1.2, 1.8], root: [0.05, 0.3], end: 1.12, len: [0.01, 0.03], out: 0.01, curl: 0.6, shine: false },
      ],
    });
    bare(head, hair.build());
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
    for (const [x, z] of [[-0.07, -0.13], [0.07, -0.13], [-0.075, 0.14], [0.075, 0.14]]) {
      b.add(new T.CapsuleGeometry(0.032, 0.06, 4, 10), M(x, 0.07, z), FUR);
      b.add(new T.SphereGeometry(1, 10, 8), M(x, 0.02, z - 0.015, 0, 0, 0, 0.04, 0.022, 0.05), FUR_L);
    }
    part(body, b.build());
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
    g.position.set(HILL.x - 0.72, 0, HILL.z + 0.35);
    g.rotation.y = 0.35;
    g.scale.setScalar(1.35);
    scene.add(g);
    actors.push((t) => {
      g.position.y = heightAt(g.position.x, g.position.z) - 0.02;
      const pant = Math.sin(t * 9.0);
      body.scale.set(1 + pant * 0.025, 1 + pant * 0.03, 1);
      head.rotation.x = 0.05 + pant * 0.04;
      head.rotation.y = Math.sin(t * 0.35) * 0.4;
      ears.forEach((e, i) => { e.rotation.z = (i ? -1 : 1) * (0.05 + Math.sin(t * 2.2 + i) * 0.08); e.rotation.x = Math.sin(t * 1.7 + i) * 0.1; });
      tail.rotation.z = Math.sin(t * 7.5) * 0.6;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Grama com vento                                                     */
  /* ------------------------------------------------------------------ */
  const WIND = `
    uniform vec2 uWind; uniform float uTime;
    float gust(vec2 xz){
      float travel=dot(xz,uWind);
      float wave=sin(travel*0.16-uTime*1.9)*0.5+0.5;
      float n=snoise(xz*0.035-uWind*uTime*0.55)*0.5+0.5;
      return smoothstep(0.25,0.95,wave*0.55+n*0.65);
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
    ig.instanceCount = n;
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
    ig.instanceCount = n;
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
  let nightTarget = wantNight();
  U.uNight.value = nightTarget;
  new MutationObserver(() => { nightTarget = wantNight(); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { nightTarget = wantNight(); });

  let W = 1, H = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    const db = renderer.getDrawingBufferSize(new T.Vector2());
    water.material.uniforms.uRes.value.copy(db);
    rt.setSize(Math.round(db.x * 0.5), Math.round(db.y * 0.5));
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

  function updateWorld(t) {
    U.uTime.value = t;
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
      if (sm.last === undefined || age < sm.last) sm.o.copy(chimneyTops[sm.src]).applyMatrix4(castleBody.matrixWorld);
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
  }

  const lastTgt = new T.Vector3();
  function place(pos, target) {
    lastTgt.copy(target);
    camera.position.copy(pos); camera.lookAt(target); camera.updateMatrixWorld();
    sky.position.copy(camera.position);
  }

  function render() {
    sky.position.copy(camera.position);
    renderReflection();
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
    const path1 = [V3([TX - 0.4, 2.9, TZ + 9]), V3([TX, 3.6, TZ - 40])];
    return [
      { d: 3.6, from: [BASE.pos.clone(), BASE.target.clone()], to: path1 },
      { d: 3.0, from: path1, to: [V3([TX + 2, 34, TZ - 110]), V3([TX + 6, 60, -420])], haze: [0, 1], hazeCurve: 2.2 },
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
    U.uHaze.value = 0; U.uNight.value = nightTarget;
    requestAnimationFrame(resize);
    window.dispatchEvent(new CustomEvent("vale:intro", { detail: "end" }));
    try { sessionStorage.setItem("vale-entrou", "1"); } catch (e) { /* sem armazenamento */ }
    if (exploreEl) startExplore();
    else if (reduce) { place(BASE.pos, BASE.target); render(); }
  }
  if ($("introSkip")) $("introSkip").addEventListener("click", skipFilm);
  // seek: posiciona a entrada num corte e num ponto do corte (usado para revisar quadros)
  window.vale = { playIntro, go: (id) => { if (!explore.active) startExplore(); go(id); }, seek(i, frac = 0.5) { if (!intro.active) playIntro(); startShot(i); intro.t = intro.shots[i].d * frac; } };


  /* ------------------------------------------------------------------ */
  /* Exploração: lugares do vale, marcadores, minimapa e cartões         */
  /* ------------------------------------------------------------------ */
  const exploreEl = $("explore");
  const OVERVIEW = { pos: new T.Vector3(-6, 44, 60), tgt: new T.Vector3(12, 0, -74) };
  const openWorld = (n) => { if (window.mundos) window.mundos.open(n); };
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
      text: "A porta de quatro cores leva a um mundo diferente em cada cor.",
      anchor: () => castle.position.clone().add(new T.Vector3(0, 15, 0)),
      view: () => { const cp = castle.position; return { pos: new T.Vector3(cp.x - 30, cp.y + 5, cp.z + 36), tgt: new T.Vector3(cp.x, cp.y + 7, cp.z) }; },
      actions: [
        { label: "Templo do Sino", sub: "AcousticBuild", door: "#C22026", run: () => openWorld("templo") },
        { label: "Nós", sub: "o jogo", door: "#0B0809", run: () => openWorld("nos") },
        { label: "Hollow Depths", sub: "abre o jogo", door: "#2E7896", href: "https://game-nauy.onrender.com/" },
        { label: "Ficar no vale", sub: "visão geral", door: "#78AB5A", run: () => go(null) },
      ],
    },
    torre: {
      k: "塔", name: "Torre dos Grimórios", kicker: "As matérias",
      text: "Nove grimórios, um para cada matéria. Cada atividade é um feitiço aprendido.",
      anchor: () => new T.Vector3(TOWER.x, TOWER.y + 26.5, TOWER.z),
      view: () => ({ pos: new T.Vector3(TOWER.x - 21, TOWER.y + 10, TOWER.z + 30), tgt: new T.Vector3(TOWER.x, TOWER.y + 11, TOWER.z) }),
      actions: [{ label: "Entrar na Torre", primary: true, run: () => openWorld("torre") }],
    },
    trem: {
      k: "汽", name: "Trem sobre a água", kicker: "A galeria",
      text: "As lembranças passam pela janela, ao entardecer.",
      anchor: () => train.position.clone().add(new T.Vector3(-5.5, 4.2, 0)),
      view: () => { const tp = train.position; return { pos: new T.Vector3(tp.x - 15, tp.y + 6.5, TRACK_Z + 21), tgt: new T.Vector3(tp.x - 3, tp.y + 0.6, TRACK_Z) }; },
      actions: [{ label: "Embarcar", primary: true, run: () => openWorld("trem") }],
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
      <line class="mm-track" x1="0" x2="200" y1="${mz(TRACK_Z)}" y2="${mz(TRACK_Z)}"/>
      <ellipse class="mm-path" cx="${mx(CASTLE_PATH.cx)}" cy="${mz(CASTLE_PATH.cz)}" rx="${CASTLE_PATH.rx / 260 * 200}" ry="${CASTLE_PATH.rz / 250 * 130}"/></svg>`;
    Object.entries(PLACES).forEach(([id, P]) => {
      const d = document.createElement("button");
      d.type = "button"; d.className = "mm-dot"; d.dataset.place = id; d.textContent = P.k;
      d.setAttribute("aria-label", P.name);
      d.addEventListener("click", () => go(id));
      mm.appendChild(d); explore.markers[id + "-mm"] = d;
    });
    explore.mm = { mx, mz };
    $("overviewBtn").addEventListener("click", () => go(null));
    $("placeClose").addEventListener("click", () => go(null));
    addEventListener("keydown", (e) => { if (e.key === "Escape" && explore.active && explore.place && !document.documentElement.classList.contains("perfil-on") && $("world").hidden) go(null); });
  }
  function camState() { return { pos: camera.position.clone(), tgt: lastTgt.clone() }; }
  function showCard(id) {
    const card = $("placeCard");
    if (!id) { card.hidden = true; return; }
    const P = PLACES[id];
    $("pcKicker").textContent = P.kicker;
    $("pcTitle").innerHTML = `<span aria-hidden="true">${P.k}</span>${P.name}`;
    $("pcText").textContent = P.text;
    const box = $("pcActions"); box.innerHTML = ""; box.classList.toggle("doors", P.actions.some((a) => a.door));
    P.actions.forEach((a) => {
      const b = document.createElement(a.href ? "a" : "button");
      b.className = "pc-btn" + (a.primary ? " primary" : "") + (a.door ? " door" : "");
      if (a.door) b.style.setProperty("--door", a.door);
      b.innerHTML = a.sub ? `<b>${a.label}</b><small>${a.sub}</small>` : a.label;
      if (a.href) { b.href = a.href; b.target = "_blank"; b.rel = "noreferrer"; } else { b.type = "button"; b.addEventListener("click", a.run); }
      box.appendChild(b);
    });
    card.hidden = false;
  }
  function go(id) {
    explore.from = camState(); explore.k = 0; explore.place = id;
    showCard(id);
    Object.entries(explore.markers).forEach(([key, el]) => el.classList.toggle("on", key.replace("-mm", "") === id));
  }
  function startExplore() {
    explore.active = true; explore.place = null; explore.from = camState(); explore.k = 0;
    exploreEl.hidden = false; hero.classList.add("exploring");
    showCard(null);
    window.dispatchEvent(new CustomEvent("vale:explore", { detail: "start" }));
    setRunning(true);
  }
  function exitExplore(toCover) {
    explore.active = false; exploreEl.hidden = true; hero.classList.remove("exploring");
    showCard(null);
    if (toCover) { explore.coverFrom = camState(); explore.coverK = 0; }
    window.dispatchEvent(new CustomEvent("vale:explore", { detail: "end" }));
  }
  function exploreStep(dt, tdt = dt) {
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
    const cpos = { torii: [TORII.x, TORII.z], castelo: [castle.position.x, castle.position.z], torre: [TOWER.x, TOWER.z], trem: [Math.max(-128, Math.min(128, train.position.x)), TRACK_Z] };
    Object.entries(cpos).forEach(([id, [x, z]]) => {
      const d = explore.markers[id + "-mm"]; d.style.left = `${(explore.mm.mx(x) / 200 * 100).toFixed(2)}%`; d.style.top = `${(explore.mm.mz(z) / 130 * 100).toFixed(2)}%`;
    });
  }

  let running = false, visible = true, last = performance.now(), clock = 30;
  function frame(now) {
    const raw = Math.max(0, (now - last) / 1000); last = now;
    const dt = Math.min(0.05, raw), tdt = Math.min(0.25, raw); // tdt: transições seguem o relógio real
    clock += dt;
    if (intro.active) {
      updateWorld(clock);
      introStep(dt);
    } else if (explore.active) {
      U.uNight.value += (nightTarget - U.uNight.value) * Math.min(1, dt * 2.2);
      pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 1.6);
      pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 1.6);
      updateWorld(clock);
      exploreStep(dt, tdt);
    } else {
      U.uNight.value += (nightTarget - U.uNight.value) * Math.min(1, dt * 2.2);
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
      } else place(p, BASE.target);
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
    resize();
    if (plaque) plaque.userData.redraw();
    captureFrames();
    U.uNight.value = nightTarget;
    if (reduce) { updateWorld(clock); place(BASE.pos, BASE.target); render(); }
    else setRunning(true);
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; setRunning(visible && !document.hidden); }).observe(canvas);
    document.addEventListener("visibilitychange", () => setRunning(visible && !document.hidden));
    let rt2; addEventListener("resize", () => { clearTimeout(rt2); rt2 = setTimeout(() => { resize(); if (reduce || !running) { place(BASE.pos, BASE.target); render(); } }, 150); });
    if (reduce) {
      new MutationObserver(() => { U.uNight.value = wantNight(); render(); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    }
    canvas.classList.add("ready");
    // pausa o vale enquanto um mundo de destaque está aberto
    window.addEventListener("mundo", (e) => { if (e.detail === "open") running = false; else setRunning(visible && !document.hidden); });
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
})();
