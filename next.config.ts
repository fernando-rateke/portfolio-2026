import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        // a capa é a cidade japonesa (página estática em public/cidade); o vale continua em /vale
        { source: "/", destination: "/cidade/index.html" },
        { source: "/cidade", destination: "/cidade/index.html" },
        { source: "/vale", destination: "/vale/index.html" },
        // os atos 2 e 3 do portfólio (docs/plano-tres-atos.md)
        { source: "/pavilhao", destination: "/pavilhao/index.html" },
        { source: "/neon", destination: "/neon/index.html" },
        // o portfólio de Tokyo Ghoul (o 20º distrito), separado e do jeito que era
        { source: "/tg", destination: "/tg/index.html" },
        // moderação das emas: página estática; a senha é conferida nas rotas /api/admin
        { source: "/admin", destination: "/admin/index.html" },
        // o controle pelo celular do modo apresentação
        { source: "/controle", destination: "/controle/index.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  // Músicas, fotos, modelos e texturas da cidade quase nunca mudam: o navegador guarda por um dia
  // e, depois disso, usa a cópia guardada enquanto confere em segundo plano se há versão nova.
  // HTML e os scripts do vale ficam de fora, para cada publicação aparecer na hora.
  async headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    return [
      { source: "/vale/three.min.js", headers: cache },
      { source: "/cidade/:dir(modelos|tex|audio|vendor|interior)/:file*", headers: cache },
      { source: "/cidade/meshopt.js", headers: cache },
      { source: "/vale/:dir(audio|nos|perfil|grim|trem|modelos)/:file*", headers: cache },
      { source: "/tg/:dir(audio|modelos)/:file*", headers: cache },
    ];
  },
  // Rotas antigas que eram apenas apelidos de outras páginas
  async redirects() {
    return [
      { source: "/projetos", destination: "/projeto", permanent: true },
      { source: "/trabalhos", destination: "/materias", permanent: true },
      // a Biblioteca Infinita saiu; quem tiver o link antigo cai na cidade
      { source: "/biblioteca", destination: "/", permanent: false },
      { source: "/biblioteca/:path*", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
