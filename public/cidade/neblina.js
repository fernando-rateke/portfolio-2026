/* A neblina: onde não há nada para ver (o campo vazio em volta da rua, o fim do terreno, o horizonte), uma neblina
   baixa e mansa ocupa o espaço, na cor do céu do tema. Bancos deitados sobre o terreno (bonitos vistos do mapa, no céu)
   e uma faixa em pé no horizonte (vista da rua). Nada disso entra na rua, na escadaria nem no platô do torii.
   Leve: poucas placas grandes, um ruído barato no shader, e as que estão perto da câmera somem. */
(() => {
  const M = (window.MUNDO = window.MUNDO || {});
  M.builders = M.builders || [];
  M.builders.push(async (M) => {
    const { T, scene } = M;
    if (!scene.fog) return;
    const uT = M.anim ? M.anim.U.uT : { value: 0 };
    let s = 21; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const altura = (x, z) => (M.h ? M.h(x, z) : 0);
    // onde há coisas: a rua com os prédios, a escadaria e o platô do torii
    const ocupado = (x, z, folga) => (Math.abs(x) < 20 + folga && z > -66 - folga && z < 36 + folga) || (Math.abs(x) < 9 + folga && z <= -66 && z > -124 - folga);
    const mat = (k, deitada) => new T.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, side: T.DoubleSide,
      uniforms: { uT, uC: { value: scene.fog.color }, uK: { value: k }, uS: { value: r() * 40 } },
      vertexShader: `varying vec2 vU; varying float vD; varying vec3 vW; void main(){ vU = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uT, uK, uS; uniform vec3 uC; varying vec2 vU; varying float vD; varying vec3 vW;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main(){ vec2 p = ${deitada ? "vW.xz * .035" : "vec2(vW.x + vW.z, vW.y * 2.) * .02"} + vec2(uT * .012 + uS, uT * .005);
          float f = n(p) * .55 + n(p * 2.3 + 5.) * .3 + n(p * 5.7) * .15;
          vec2 q = vU - .5; float borda = ${deitada ? "1. - smoothstep(.25, .5, length(q))" : "smoothstep(0., .2, vU.x) * smoothstep(1., .8, vU.x) * smoothstep(0., .45, vU.y) * smoothstep(1., .35, vU.y)"};
          float a = smoothstep(.3, .75, f) * borda * uK * smoothstep(12., 40., vD);
          gl_FragColor = vec4(mix(uC, vec3(1.), .28), a); }` });
    const grupo = new T.Group(); grupo.name = "neblina"; scene.add(grupo);
    // um tapete de neblina densa que acompanha o relevo e cobre todo o campo de perto; só a rua, a escadaria e o platô
    // do torii ficam abertos (com bordas suaves, as árvores em volta aparecem saindo da neblina)
    const tapete = (alto, k) => {
      const X0 = -165, X1 = 165, Z0 = 60, Z1 = -176, nx = 66, nz = 48;
      const geo = new T.PlaneGeometry(X1 - X0, Z0 - Z1, nx, nz); geo.rotateX(-Math.PI / 2); geo.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
      const pa = geo.attributes.position; for (let i = 0; i < pa.count; i++) pa.setY(i, altura(pa.getX(i), pa.getZ(i)) + alto); geo.computeBoundingSphere();
      const m = new T.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, side: T.DoubleSide, uniforms: { uT, uC: { value: scene.fog.color }, uK: { value: k }, uS: { value: r() * 40 } },
        vertexShader: `varying float vD; varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform float uT, uK, uS; uniform vec3 uC; varying float vD; varying vec3 vW;
          float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
          float caixa(vec2 p, vec2 a, vec2 b, float bd){ vec2 d = max(a - p, p - b); return 1. - smoothstep(0., bd, max(d.x, d.y)); }
          void main(){ vec2 p = vW.xz * .03 + vec2(uT * .01 + uS, uT * .004); float f = n(p) * .5 + n(p * 2.1 + 3.) * .3 + n(p * 4.7) * .2;
            // a rua com os prédios, a escadaria e o platô do torii ficam abertos
            float aberto = max(caixa(vW.xz, vec2(-17., -64.), vec2(17., 34.), 12.), caixa(vW.xz, vec2(-7., -126.), vec2(7., -60.), 9.));
            float borda = smoothstep(165., 140., abs(vW.x)) * smoothstep(-176., -150., vW.z) * smoothstep(60., 40., vW.z);
            float a = uK * mix(.72, 1., smoothstep(.25, .75, f)) * (1. - aberto) * borda * smoothstep(5., 22., vD);
            gl_FragColor = vec4(mix(uC, vec3(1.), .2 + f * .12), a); }` });
      const mesh = new T.Mesh(geo, m); mesh.renderOrder = 4; mesh.frustumCulled = false; grupo.add(mesh); };
    tapete(2.2, 0.82); tapete(5.5, 0.45);
    // a faixa em pé no horizonte, em volta de tudo
    const empe = mat(0.75, false);
    for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, d = 175 + r() * 60, x = Math.sin(a) * d, z = -40 + Math.cos(a) * d * 1.15;
      const w = 110 + r() * 50, hgt = 26 + r() * 16; const m = new T.Mesh(new T.PlaneGeometry(w, hgt), empe); m.position.set(x, altura(x, z) + hgt * 0.32, z); m.lookAt(0, m.position.y, -40); m.renderOrder = 4; grupo.add(m); }
    M.neblina = grupo;
  });
})();
