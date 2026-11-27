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
    // bancos deitados sobre o terreno de perto, fora dos lugares ocupados
    const deitada = mat(0.65, true);
    for (let x = -150; x <= 150; x += 22) for (let z = 50; z >= -170; z -= 22) {
      const px = x + (r() - 0.5) * 14, pz = z + (r() - 0.5) * 14; if (ocupado(px, pz, 6) || r() < 0.1) continue;
      const w = 34 + r() * 26; const m = new T.Mesh(new T.PlaneGeometry(w, w), deitada); m.rotation.x = -Math.PI / 2; m.rotation.z = r() * Math.PI;
      m.position.set(px, altura(px, pz) + 1.2 + r() * 2.5, pz); m.renderOrder = 4; grupo.add(m); }
    // a faixa em pé no horizonte, em volta de tudo
    const empe = mat(0.75, false);
    for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, d = 175 + r() * 60, x = Math.sin(a) * d, z = -40 + Math.cos(a) * d * 1.15;
      const w = 110 + r() * 50, hgt = 26 + r() * 16; const m = new T.Mesh(new T.PlaneGeometry(w, hgt), empe); m.position.set(x, altura(x, z) + hgt * 0.32, z); m.lookAt(0, m.position.y, -40); m.renderOrder = 4; grupo.add(m); }
    M.neblina = grupo;
  });
})();
