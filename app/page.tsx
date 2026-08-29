import App from "@/components/App";
import analysis from "@/fixtures/pr-418/analysis.json";
import type { Analysis } from "@/lib/types";

/**
 * Por ahora el análisis viene del fixture: la UI se construye contra el contrato
 * sin esperar al analizador. Ver docs/spec/03-analizador.md
 */
export default function Page() {
  return <App analysis={analysis as Analysis} />;
}
