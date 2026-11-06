import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // A experiência do Vale (página estática em public/vale) é a página inicial
      beforeFiles: [
        { source: "/", destination: "/vale/index.html" },
        { source: "/vale", destination: "/vale/index.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
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
