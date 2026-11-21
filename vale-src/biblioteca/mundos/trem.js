/* Mundo do 1º e 2º ano: o trem sobre a água, trazido do vale. Um vagão de madeira corre sobre um mar raso ao
   entardecer; pela janela passam postes, ilhotas, uma estação e as lembranças da jornada em molduras sobre a água.
   Um senhor de chapéu lê o jornal no banco da janela (personagem original), uma sombra de passageiro vai no fundo,
   e um bando de garças cruza o céu de vez em quando. Clicar numa lembrança desacelera o trem e abre a página. */
(() => {
  window.MUNDOS = window.MUNDOS || {};
  window.MUNDOS.trem = (ctx) => {
    const T = ctx.T;
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


    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(58, 1, 0.1, 1500);
    const env = envUniforms({ sun: [-0.35, 0.32, -0.88], sunCol: "#FFC59A", amb: "#4A3A44", fog: "#E9B9A2", fogDen: 0.006, glowCol: "#FFD49A" });
    const BASE = "/vale/";
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
        side: T.BackSide, depthWrite: false, uniforms: { uDark: UD, uTime: { value: 0 } },
        vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `${NOISE} ${SKY} uniform float uTime; varying vec3 vD;
          float fbm(vec2 p){ float a=0.5, f=0.0; for(int i=0;i<5;i++){ f+=a*snoise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return f; }
          void main(){ vec3 d=normalize(vD); vec3 c=skyCol(d);
            vec3 sd=normalize(vec3(-0.45,0.09,-0.89));
            if (d.y>0.0) {
              vec2 q=d.xz/(d.y+0.12)*0.9+vec2(uTime*0.004,0.0);
              float dens=fbm(q*0.55)*0.6+fbm(q*1.6+3.0)*0.4;
              float cov=smoothstep(0.02,0.45,dens)*smoothstep(0.0,0.08,d.y)*smoothstep(0.75,0.25,d.y);
              float lit=clamp(fbm(q*0.55+sd.xz*0.25)-dens+0.55,0.0,1.0);
              float rim=pow(max(dot(d,sd),0.0),6.0);
              vec3 shade=mix(vec3(0.62,0.5,0.66),vec3(1.0,0.82,0.7),lit)+vec3(1.0,0.75,0.45)*rim*0.9;
              shade=mix(shade,vec3(0.2,0.18,0.3),uDark);
              c=mix(c,shade,cov*0.9);
            }
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
            vec3 sd=normalize(vec3(-0.45,0.09,-0.89)); float gl=pow(max(dot(R,sd),0.0),300.0)*(0.6+2.4*smoothstep(0.3,0.9,snoise(q*vec2(1.5,6.0)+uTime*0.8)));
            c+=vec3(1.0,0.9,0.7)*gl*(1.0-uDark);
            // os trilhos do outro lado, logo abaixo da água
            float rz=vW.z+4.2; float rail=smoothstep(0.035,0.0,abs(abs(rz)-0.36)); float slp=step(abs(rz),0.62)*step(0.72,fract(q.x/0.7));
            float under=(1.0-smoothstep(3.0,40.0,d))*0.55; c=mix(c,vec3(0.25,0.2,0.22),max(rail*0.85,slp*0.45)*under);
            float alpha=mix(0.72,0.97,smoothstep(2.0,90.0,d));
            gl_FragColor=vec4(c,alpha);
          }`,
      }));
      water.material.transparent = true; water.material.depthWrite = false; water.renderOrder = 2; water.rotation.x = -Math.PI / 2; water.position.y = -0.35; scene.add(water); scene.userData.water = water;

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
      // bagageiros de latão sobre as janelas e plaquinhas de anúncio
      for (const zz of [-1.22]) { for (const dz of [0, 0.1, 0.2]) B.add(new T.CylinderGeometry(0.008, 0.008, 15.6, 6), M(0, 2.4, zz + dz, 0, 0, Math.PI / 2), "#7A5A2A"); for (let x = -7.2; x <= 7.2; x += 1.8) B.add(new T.BoxGeometry(0.02, 0.12, 0.02), M(x, 2.46, zz + 0.2), "#5A4020"); }
      winX.forEach((x, i) => { B.add(new T.BoxGeometry(1.0, 0.14, 0.02), M(x - 0.6, 2.55, -1.38), ["#C8A878", "#9AB0A0", "#D8B0A0", "#A8A0C0", "#C8C090"][i]); B.add(new T.BoxGeometry(0.8, 0.14, 0.02), M(x + 0.55, 2.55, -1.38), ["#B07A60", "#D8C8A0", "#90A8C0", "#C89888", "#A0B888"][i]); });
      // parede do lado da câmera (vista ao olhar em volta)
      B.add(new T.BoxGeometry(16, 2.66, 0.12), M(0, 1.33, 1.5), WOOD);
      scene.add(new T.Mesh(B.build(), mat));
      // a luz do sol baixo atravessando as janelas: feixes no ar e manchas quentes no banco e na parede da frente
      const beamM = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: { uDark: UD, uTime: { value: 0 } },
        vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: "uniform float uDark, uTime; varying vec2 vU; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); } void main(){ float a = smoothstep(0.0, 0.2, vU.x) * smoothstep(1.0, 0.8, vU.x) * smoothstep(0.0, 0.25, vU.y) * smoothstep(1.0, 0.7, vU.y) * 0.06; float dust = 0.0; gl_FragColor = vec4(vec3(1.0, 0.78, 0.5) * (a + dust * 0.5) * (1.0 - uDark), 1.0); }" });
      const patchM = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uDark: UD },
        vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: "uniform float uDark; varying vec2 vU; void main(){ float a = smoothstep(0.0, 0.06, vU.x) * smoothstep(1.0, 0.94, vU.x) * smoothstep(0.0, 0.1, vU.y) * smoothstep(1.0, 0.9, vU.y); gl_FragColor = vec4(vec3(1.0, 0.72, 0.42) * a * 0.32 * (1.0 - uDark), 1.0); }" });
      scene.userData.beams = [];
      winX.forEach((x) => {
        const bm = new T.Mesh(new T.PlaneGeometry(ww * 0.9, 3.0), beamM); bm.position.set(x + 0.55, 1.1, 0.0); bm.rotation.set(-1.15, 0, 0.18); scene.add(bm); scene.userData.beams.push(bm);
        const p1 = new T.Mesh(new T.PlaneGeometry(ww * 0.85, 0.5), patchM); p1.position.set(x + 0.8, 0.57, 1.0); p1.rotation.x = -Math.PI / 2; scene.add(p1);
        const p2 = new T.Mesh(new T.PlaneGeometry(ww * 0.85, 0.7), patchM); p2.position.set(x + 0.9, 1.05, 1.43); p2.rotation.y = Math.PI; scene.add(p2);
      });
      scene.userData.beamM = beamM;

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

      // reflexos: uma cópia de cada coisa que passa, espelhada embaixo da água
      const WY = -0.35; scene.userData.refl = [];
      movers.slice().forEach((o) => { const r2 = o.m.clone(true); r2.scale.y = -o.m.scale.y; scene.add(r2); scene.userData.refl.push({ o, r: r2 }); });
      { const wr = wire.clone(); wr.scale.y = -1; wr.position.y = 2 * WY; scene.add(wr); scene.userData.wireR = wr; }
      void WY;
      // um trem que vem no sentido contrário, no trilho de lá
      scene.add(new T.HemisphereLight(0xffd8c0, 0x5a3a40, 1.0)); { const sl = new T.DirectionalLight(0xffc090, 1.1); sl.position.set(-30, 12, -60); scene.add(sl); }
      const other = new T.Group(); other.visible = false; scene.add(other); scene.userData.other = other;
      new T.GLTFLoader().load("/vale/modelos/trem.glb", (gl) => { const m = gl.scene; const box = new T.Box3().setFromObject(m), sz = box.getSize(new T.Vector3()), k = 2.9 / sz.y;
        m.scale.setScalar(k); m.position.set(-(box.min.x + box.max.x) / 2 * k, -box.min.y * k, -(box.min.z + box.max.z) / 2 * k);
        for (let i = 0; i < 3; i++) { const c = i ? m.clone(true) : m; c.position.x += i * sz.x * k * 1.02; other.add(c); }
        const ro = other.clone(true); ro.scale.y = -1; ro.position.y = 2 * -0.35 - (-0.3); scene.add(ro); scene.userData.otherR = ro; ro.visible = false; });
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


    const sub = { name: "A jornada", acts: MEMS.map((m) => ({ t: m.t, s: m.tag, r: m.d, img: "trem/" + m.src.split("/").pop() })) };
    const look = { x: 0, y: 0, sx: 0, sy: 0 };
    build(); startSound();
    const fx = ctx.fantasy(scene, { center: new T.Vector3(0, 1.7, -4), radius: 5, height: 1.4, colors: ["#ffc8e0", "#ffe090", "#a8d0ff"], count: 0, power: 0.6, dim: 0.8, motes: 0, moteSize: 0.018 });
    // o dragão branco passa de vez em quando, bem longe, mesmo sem o final
    { const dr = scene.userData.dragon; dr.next = 1e9; dr.g.visible = false; }
    const birds = new T.Group(); scene.add(birds); for (let k = 0; k < 9; k++) { const b = new T.Group(); for (const sd of [-1, 1]) { const w = new T.Mesh(new T.PlaneGeometry(2.2, 0.5), new T.MeshBasicMaterial({ color: 0xf4f0ea, side: T.DoubleSide })); w.position.x = sd * 1.1; b.add(w); } b.position.set(-Math.abs(k - 4) * 4, -Math.abs(k - 4) * 0.8, (k - 4) * 3); birds.add(b); } birds.visible = false; let birdT = 10;
    return {
      name: "O trem sobre a água", sub: "1º e 2º ano", scene,
      update(dt, t) {
        fx.update(t);
        time += dt; look.sx += (look.x - look.sx) * Math.min(1, dt * 2.5); look.sy += (look.y - look.sy) * Math.min(1, dt * 2.5);
        speed += (target - speed) * Math.min(1, dt * 1.2); travel += speed * dt;
        scene.userData.water.material.uniforms.uTravel.value = travel; scene.userData.water.material.uniforms.uTime.value = time;
        movers.forEach((o) => { o.m.position.x = wrap(o.base - travel * (o.par || 1)); if (o.photo) o.m.position.y = 1.6 + Math.sin(time * 0.8 + o.i) * 0.06; });
        scene.userData.wire.position.x = -(travel % (L / 14)); if (scene.userData.wireR) scene.userData.wireR.position.x = scene.userData.wire.position.x;
        for (const rf of scene.userData.refl) { rf.r.position.x = rf.o.m.position.x; rf.r.position.y = 2 * -0.35 - rf.o.m.position.y; rf.r.position.z = rf.o.m.position.z; }
        scene.userData.sky.material.uniforms.uTime.value = time; scene.userData.beamM.uniforms.uTime.value = time;
        { const ot = scene.userData.other, orf = scene.userData.otherR; if (ot) { ot.userData.t = (ot.userData.t == null ? -18 : ot.userData.t) + dt; const u = ot.userData.t; const on = u > 0 && u < 9; ot.visible = on; if (orf) orf.visible = on; if (on) { const x = -140 + u * 34 - travel * 0.0; ot.position.set(x, -0.3, -4.2); if (orf) orf.position.set(x, 2 * -0.35 + 0.3, -4.2); } if (u > 9) ot.userData.t = -(35 + Math.random() * 25); } }
        birdT -= dt; if (birdT < 0 && !birds.visible) { birds.visible = true; birds.userData.u = 0; } if (birds.visible) { const u = (birds.userData.u += dt / 22); birds.position.set(-140 + u * 280, 34 + Math.sin(u * 3) * 4, -150); birds.children.forEach((b, i) => b.children.forEach((w, j) => (w.rotation.z = (j ? -1 : 1) * Math.sin(time * 5 + i) * 0.35))); if (u > 1) { birds.visible = false; birdT = 30 + Math.random() * 25; } }
        const dr = scene.userData.dragon;
        if (dr.t < 0) { dr.next -= dt; if (dr.next <= 0) { dr.t = 0; dr.g.visible = true; } }
        else { dr.t += dt; const at = (u) => new T.Vector3(-120 + u * 18, 30 + Math.sin(u * 1.7) * 5, -170 + Math.sin(u * 0.6) * 16);
          dr.head.position.copy(at(dr.t)); dr.head.lookAt(at(dr.t + 0.05)); dr.head.rotateY(Math.PI / 2);
          dr.segs.forEach((sg, i) => { const p = at(dr.t - (i + 1) * 0.085); p.y += Math.sin(time * 3 - i * 0.45) * 1.4; sg.m.position.copy(p); if (sg.mane) { sg.mane.position.copy(p).add(new T.Vector3(0, sg.r * 1.1, 0)); sg.mane.rotation.z = Math.sin(time * 4 - i) * 0.3 - 0.4; } });
          if (dr.t > 15.5) { dr.t = -1; dr.g.visible = false; dr.next = 45 + Math.random() * 30; } }
        photos.forEach((p) => { const on = hovered === p.i || open === p.i ? 1 : 0; p.glowM.material.uniforms.uOn.value += (on - p.glowM.material.uniforms.uOn.value) * Math.min(1, dt * 6); });
        const bump = Math.sin(time * 7.3) * 0.006 * speed / SPEED0 + Math.sin(time * 1.3) * 0.004;
        camera.position.set(look.sx * 0.35, 1.42 + bump, 1.0); camera.lookAt(look.sx * 1.6, 1.66 - look.sy * 0.35, -6); camera.rotation.z += Math.sin(time * 0.9) * 0.004;
        scene.userData.sky.position.copy(camera.position);
      },
      render(rr) { rr.setRenderTarget(null); rr.render(scene, camera); },
      resize(w, h) { camera.aspect = w / h; camera.fov = w / h < 0.9 ? 78 : 58; camera.updateProjectionMatrix(); },
      pick(n) { ndc.set(n.x, n.y); ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(photos.map((p) => p.photo))[0]; hovered = h ? h.object.userData.i : null; if (hovered === null) return null; const i = hovered, m = MEMS[i];
        return { label: [m.t, m.tag], go: () => { open = i; target = 0.25; if (ctx.openPages) ctx.openPages(sub, i); } }; },
      look(dx, dy) { look.x = Math.max(-1, Math.min(1, look.x + dx * 0.004)); look.y = Math.max(-1, Math.min(1, look.y + dy * 0.004)); },
      back() { if (open !== null) { open = null; target = SPEED0; return true; } return false; },
      dispose() { stopSound(); try { if (audio) audio.close(); } catch (e) { /* já fechado */ } scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); },
    };
  };
})();
