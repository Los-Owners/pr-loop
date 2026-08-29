import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El repo vive dentro de un árbol con otro lockfile; fija la raíz para que Turbopack no la infiera.
  turbopack: { root: __dirname },

  // El analizador lee la doctrina de `.agents/skills` en tiempo de ejecución. Sin esto el
  // traceo de Next no los mete en el bundle de la función y la skill desaparece al desplegar:
  // el análisis seguiría corriendo, pero sin la mitad de su prompt y sin avisar.
  outputFileTracingIncludes: {
    "/api/analyze": [".agents/skills/**/*.md"],
  },
};

export default nextConfig;
