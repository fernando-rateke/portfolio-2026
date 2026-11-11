import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // A experiência do Vale (página estática em public/vale) é a página inicial
      beforeFiles: [
        { source: "/", destination: "/vale/index.html" },
        { source: "/vale", destination: "/vale/index.html" },
        // portfólio novo (Tokyo Ghoul), em construção até assumir a página inicial
        { source: "/tg", destination: "/tg/index.html" },
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
      { source: "/vale/:dir(audio|nos|perfil|grim|trem)/:file*", headers: cache },
      { source: "/tg/three.min.js", headers: cache },
      { source: "/tg/audio/:file*", headers: cache },
    ];
  },
  // Rotas antigas que eram apenas apelidos de outras páginas
  async redirects() {
    return [
      { source: "/projetos", destination: "/projeto", permanent: true },
      { source: "/trabalhos", destination: "/materias", permanent: true },
    ];
  },
};

export default nextConfig;
