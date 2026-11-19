import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // A experiência do Vale (página estática em public/vale) é a página inicial
      beforeFiles: [
        // a capa agora é a Biblioteca Infinita; o vale continua em /vale
        { source: "/", destination: "/biblioteca/index.html" },
        { source: "/vale", destination: "/vale/index.html" },
        // moderação das emas: página estática; a senha é conferida nas rotas /api/admin
        { source: "/admin", destination: "/admin/index.html" },
        // a Biblioteca Infinita: página própria, com as atividades nas estantes
        { source: "/biblioteca", destination: "/biblioteca/index.html" },
        // o controle pelo celular do modo apresentação
        { source: "/controle", destination: "/controle/index.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  // Músicas, fotos e a biblioteca 3D quase nunca mudam: o navegador guarda por um dia
  // e, depois disso, usa a cópia guardada enquanto confere em segundo plano se há versão nova.
  // HTML e os scripts do vale ficam de fora, para cada publicação aparecer na hora.
  async headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    return [
      { source: "/vale/three.min.js", headers: cache },
      { source: "/biblioteca/modelos/:file*", headers: cache },
      { source: "/biblioteca/mundos/:dir/:file*", headers: cache },
      { source: "/vale/:dir(audio|nos|perfil|grim|trem|modelos)/:file*", headers: cache },
    ];
  },
  // Rotas antigas que eram apenas apelidos de outras páginas
  async redirects() {
    return [
      { source: "/projetos", destination: "/projeto", permanent: true },
      { source: "/trabalhos", destination: "/materias", permanent: true },
      // o portfólio de Tokyo Ghoul saiu; quem tiver o link antigo cai no vale
      { source: "/tg/:path*", destination: "/", permanent: false },
      { source: "/tg", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
