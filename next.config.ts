import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El repo vive dentro de un árbol con otro lockfile; fija la raíz para que Turbopack no la infiera.
  turbopack: { root: __dirname },
};

export default nextConfig;
