/**
 * Chequeo de aceptación del analizador contra fixtures/pr-418.
 *
 * El fixture es el contrato: el analizador se considera listo cuando encuentra los tres
 * defectos que el PR de ejemplo enseña. No compara contra analysis.json campo por campo
 * —el modelo no es determinista y no hace falta que lo sea—, comprueba que lo que importa
 * aparece. Ver fixtures/pr-418/README.md
 *
 * Uso:  npm run dev        (en otra terminal, con ANTHROPIC_API_KEY exportada)
 *       npm run check:fixture
 */

import { readFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const diff = readFileSync("fixtures/pr-418/diff.patch", "utf8");

const response = await fetch(`${BASE}/api/analyze`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ diff, title: "Aplicar descuento por volumen en el checkout" }),
});

if (!response.ok) {
  console.error(`✗ ${response.status}:`, (await response.json()).error);
  process.exit(1);
}

const { analysis, dropped, problems, usage } = await response.json();

const checks = [
  {
    // 1 · Frontera mal puesta: la spec decía «10 o más», el código usa `> 10`.
    name: "Encuentra la frontera del umbral y la sitúa en 11",
    ok: analysis.decisions.some((d) => /11|mas de 10|más de 10/i.test(d.actual)),
  },
  {
    name: "Recorre el caso justo en el borde como camino propio",
    ok: analysis.paths.some((p) => p.kind === "alternative" && /10|umbral|borde/i.test(p.name + JSON.stringify(p.messages))),
  },
  {
    // 2 · Algo que nadie pidió: la llamada al Servicio de Cupones.
    name: "Declara el Servicio de Cupones como participante",
    ok: analysis.participants.some((p) => /cupon|cupón/i.test(p.name)),
  },
  {
    // 3 · Una prueba que no prueba nada: expect(res).not.toBeNull()
    name: "Marca la prueba vacía como no sustantiva",
    ok: analysis.tests.some((t) => t.substantive === false),
  },
  {
    name: "Parafrasea la aserción en vez de copiar el nombre del test",
    ok: analysis.tests.every((t) => !/^aplica descuento$/i.test(t.asserts.trim())),
  },
  {
    // La llamada de red sin timeout ni fallback en pricing.client.ts
    name: "Encuentra al menos un camino que el código no maneja",
    ok: analysis.paths.some((p) => p.kind === "missing"),
  },
  {
    name: "Todo elemento cita una línea con su fragmento",
    ok: [
      ...analysis.participants.map((p) => p.evidence),
      ...analysis.paths.flatMap((p) => p.messages.map((m) => m.evidence)),
      ...analysis.decisions.map((d) => d.evidence),
      ...analysis.tests.map((t) => t.file),
    ].every((e) => typeof analysis.snippets[e] === "string"),
  },
  {
    // Regla 3: durante la sesión no se muestra código. Solo los snippets pueden tenerlo.
    name: "No se filtra sintaxis fuera de los snippets",
    ok: !/items\.length|=>|expect\(|tobenull/.test(
      JSON.stringify({ ...analysis, snippets: undefined }).toLowerCase(),
    ),
  },
];

for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}`);

if (dropped.length) {
  console.log(`\nDescartado por no citar líneas (${dropped.length}):`);
  for (const d of dropped) console.log(`  · ${d.kind} ${d.id}: ${d.reason}`);
}
if (problems.length) console.log(`\nAnálisis corto: ${problems.join("; ")}`);

console.log(
  `\n${usage.input} tokens de entrada, ${usage.output} de salida · $${usage.costUsd.toFixed(3)}`,
);
console.log(
  `${analysis.participants.length} participantes · ${analysis.paths.length} caminos ` +
    `(${analysis.paths.filter((p) => p.kind === "missing").length} sin manejar) · ` +
    `${analysis.decisions.length} decisiones · ${analysis.tests.length} pruebas`,
);

const failed = checks.filter((c) => !c.ok).length;
console.log(failed ? `\n${failed} de ${checks.length} sin pasar.` : `\nLos ${checks.length} pasan.`);
process.exit(failed ? 1 : 0);
