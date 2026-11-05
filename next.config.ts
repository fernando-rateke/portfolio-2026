import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Rotas antigas que eram apenas apelidos de outras páginas
  async redirects() {
    return [
      { source: "/projetos", destination: "/projeto", permanent: true },
      { source: "/trabalhos", destination: "/materias", permanent: true },
    ];
  },
};

export default nextConfig;
