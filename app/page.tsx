import App from "@/components/App";
import example from "@/fixtures/pr-418/analysis.json";
import type { Analysis } from "@/lib/types";

/**
 * El PR de ejemplo viaja con la página: es el que se enseña en vivo, no toca la red y no
 * gasta un análisis. Cualquier otra URL pasa por /api/analyze y por Claude.
 * Ver docs/spec/03-analizador.md
 */
export default function Page() {
  return <App example={example as Analysis} />;
}
