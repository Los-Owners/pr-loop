/**
 * Chequeo de los diagramas: genera el Mermaid desde el fixture y lo valida contra el
 * parser oficial de mermaid.js — el mismo motor que usa GitHub.
 *
 * No lo valida por su cuenta: invoca el `validate.mjs` de la skill `architecture-map`,
 * que es el Paso 5 de esa skill. Si el diagrama pasa acá, renderiza donde importa.
 *
 * Uso:  npm run check:mermaid
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { mermaidForAnalysis, mermaidForPath, sequenceDiagram } from "../lib/mermaid.ts";

const VALIDATOR = ".agents/skills/architecture-map/scripts/validate.mjs";

if (!existsSync(VALIDATOR)) {
  console.error(`✗ Falta la skill architecture-map en ${VALIDATOR}.`);
  process.exit(1);
}

const analysis = JSON.parse(readFileSync("fixtures/pr-418/analysis.json", "utf8"));
const dir = mkdtempSync(join(tmpdir(), "pr-loop-mmd-"));

const TINTS = ["#1F7A4C", "#2563B0", "#C0392F", "#A87515", "#A6A6B0"];

const cases = [
  ...mermaidForAnalysis(analysis).map((d) => ({
    name: `camino «${d.name}» (${d.kind})`,
    source: d.diagram,
  })),
  // Pintado por veredicto: cada mensaje cae en un color distinto, así se ejercitan los
  // bloques `rect` contiguos y los cortes entre ellos.
  ...analysis.paths.map((path, p) => ({
    name: `camino «${path.name}» pintado por veredicto`,
    source: mermaidForPath(analysis, path, (_m, i) => TINTS[(i + p) % TINTS.length]),
  })),
  // Las tres trampas de sintaxis que las reglas de la skill mandan escapar. Si el escape
  // se rompe, el parser lo dice acá y no en el navegador de quien lea el reporte.
  {
    name: "escapes: «;» dentro de un label",
    source: sequenceDiagram({
      actors: [
        { id: "app", name: "App; cliente" },
        { id: "api", name: "API" },
      ],
      arrows: [{ from: "app", to: "api", label: "pide el total; luego responde" }],
    }),
  },
  {
    name: "escapes: «#» dentro de un label",
    source: sequenceDiagram({
      actors: [
        { id: "app", name: "App" },
        { id: "api", name: "API #2" },
      ],
      arrows: [{ from: "app", to: "api", label: "resuelve el PR #418" }],
    }),
  },
  {
    name: "escapes: «end» como texto completo",
    source: sequenceDiagram({
      actors: [
        { id: "app", name: "App" },
        { id: "api", name: "end" },
      ],
      arrows: [{ from: "app", to: "api", label: "end", tint: "#C0392F" }],
    }),
  },
];

let failed = 0;

for (const [i, c] of cases.entries()) {
  const file = join(dir, `case-${i}.mmd`);
  writeFileSync(file, c.source, "utf8");
  try {
    execFileSync("node", [VALIDATOR, file], { stdio: "pipe" });
    console.log(`✓ ${c.name}`);
  } catch (e) {
    failed += 1;
    console.log(`✗ ${c.name}`);
    console.log(`    ${String(e.stderr ?? e.message).trim().split("\n").join("\n    ")}`);
    console.log(`    ${c.source.split("\n").join("\n    ")}`);
  }
}

rmSync(dir, { recursive: true, force: true });

console.log(
  failed
    ? `\n${failed} de ${cases.length} diagramas no pasan el parser oficial.`
    : `\nLos ${cases.length} diagramas pasan el parser oficial.`,
);
process.exit(failed ? 1 : 0);
