/* A base das animações. Tudo o que se mexe na cidade se mexe na placa de vídeo, nunca num laço em JavaScript:
   o processador só avisa a hora (um número por quadro) e cada vértice calcula onde está. Assim dá para ter milhares
   de folhas, pétalas e lanternas sem custo no processador, e o número de shaders não cresce (todos os materiais com
   vento dividem a mesma versão do shader).

   M.anim.U           relógio e vento compartilhados por todos: uT (segundos), uVento (direção xz), uForca (0 a 2)
   M.anim.vento(m, o) faz um material balançar com o vento: o que está mais alto no modelo balança mais.
                      o = { flex (quanto balança), altura (altura do modelo, em metros), ondas (quão rápido) }
   M.anim.particulas(o)
                      um InstancedMesh em que cada cópia anda sozinha pelo shader. o = { geo, mat, n, attrs, mover }
                      attrs: { aNome: [Float32Array, tamanho] } por cópia; mover: GLSL que lê os attrs e uT e define
                      "vec3 desl" (onde a cópia está, no mundo) e "mat3 giro" (como ela está virada)
   M.anim.giro        funções GLSL de rotação (rotX, rotY, rotZ) para usar no "mover"

   Prontos para usar daqui para a frente: vento nas árvores e no capim, folhas caindo, lanternas voando, fogo das
   lanternas e ondas na água usam só estas três peças. */
(() => {
  const M = (window.MUNDO = window.MUNDO || {});
  const T = window.THREE;
  const U = { uT: { value: 0 }, uVento: { value: new T.Vector2(0.86, 0.5) }, uForca: { value: 1 } };
  if (M.ticks) M.ticks.push((t) => { U.uT.value = t; });

  const GIRO = `mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }
    mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c, 0., -s, 0., 1., 0., s, 0., c); }
    mat3 rotZ(float a){ float c = cos(a), s = sin(a); return mat3(c, s, 0., -s, c, 0., 0., 0., 1.); }`;

  /* vento: soma de três ondas (uma lenta e larga, duas rápidas) que variam com a posição no mundo, então
     árvores vizinhas balançam quase juntas e as distantes, não. */
  function vento(mat, { flex = 1, altura = 3, ondas = 1 } = {}) {
    const meus = { uFlexV: { value: flex }, uAltV: { value: altura }, uOndaV: { value: ondas } };
    const antes = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      if (antes) antes(sh, r);
      Object.assign(sh.uniforms, U, meus);
      sh.vertexShader = "uniform float uT, uForca, uFlexV, uAltV, uOndaV; uniform vec2 uVento;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
        {
          vec4 wV = vec4(transformed, 1.);
          #ifdef USE_INSTANCING
            wV = instanceMatrix * wV;
          #endif
          wV = modelMatrix * wV;
          float hV = clamp(transformed.y / uAltV, 0., 1.5), fV = hV * hV * uFlexV * uForca;
          float tV = uT * uOndaV;
          float gV = sin(tV * 0.45 + wV.x * 0.05 + wV.z * 0.04) * 0.7 + sin(tV * 1.7 + wV.x * 0.35 + wV.z * 0.27) * 0.25 + sin(tV * 3.3 + wV.x * 0.9) * 0.08;
          transformed.xz += uVento * (gV + 0.35) * fV * 0.12;
        }`);
    };
    // o mesmo texto de shader para todos os materiais com vento: a placa compila uma versão só
    mat.customProgramCacheKey = () => "vento";
    mat.needsUpdate = true;
    return mat;
  }

  /* partículas: n cópias da mesma geometria; o shader tira a matriz de cada cópia de "mover" */
  function particulas({ geo, mat, n, attrs = {}, mover, chave }) {
    for (const [nome, [arr, tam]] of Object.entries(attrs)) geo.setAttribute(nome, new T.InstancedBufferAttribute(arr, tam));
    const decl = Object.entries(attrs).map(([nome, [, tam]]) => `attribute ${tam === 1 ? "float" : "vec" + tam} ${nome};`).join("\n");
    const antes = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      if (antes) antes(sh, r);
      Object.assign(sh.uniforms, U);
      sh.vertexShader = `uniform float uT, uForca; uniform vec2 uVento;\n${decl}\n${GIRO}\nvoid moverP(out vec3 desl, out mat3 giro){ desl = vec3(0.); giro = mat3(1.); ${mover} }\n` + sh.vertexShader
        .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\n { vec3 dN; mat3 gN; moverP(dN, gN); objectNormal = gN * objectNormal; }")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\n { vec3 dV; mat3 gV; moverP(dV, gV); transformed = gV * transformed + dV; }");
    };
    mat.customProgramCacheKey = () => "part-" + (chave || mover);
    const im = new T.InstancedMesh(geo, mat, n);
    // a matriz de cada cópia fica sendo a identidade: quem posiciona é o shader
    const id = new T.Matrix4(); for (let i = 0; i < n; i++) im.setMatrixAt(i, id);
    im.frustumCulled = false;
    return im;
  }

  M.anim = { U, vento, particulas, giro: GIRO };
})();
