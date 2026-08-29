import type { Analysis, Question } from "./types";
import { UNSURE } from "./scoring";

const NO_SE = { id: UNSURE, label: "No sé" };

/** Servicios que no son los extremos del flujo: sobre esos se pregunta. */
function innerParticipants(a: Analysis) {
  return a.participants.filter((p) => p.id !== "app" && p.id !== "api");
}

function happyPath(a: Analysis) {
  return a.paths.find((p) => p.kind === "happy") ?? a.paths[0];
}

function nameOf(a: Analysis, id: string) {
  return a.participants.find((p) => p.id === id)?.name ?? id;
}

/**
 * Las preguntas NO las genera un modelo: salen del análisis con código normal.
 * Instantáneo, gratis y reproducible — en un demo en vivo eso vale más que ser listo.
 * Ver docs/spec/01-sesion.md
 */
export function buildQuestions(a: Analysis): Question[] {
  const inner = innerParticipants(a);
  const happy = happyPath(a);

  // 1 · Participantes. La trampa es un servicio plausible que no está en el análisis.
  const trap = { id: "__trap", label: "Servicio de Inventario" };
  const q1: Question = {
    id: "q1",
    title: "Además de la App y el API, ¿qué servicios participan en este flujo?",
    hint: "Cada servicio que marques aparece como una línea de vida en tu diagrama.",
    multi: true,
    needsText: true,
    panel: "diagram",
    options: [
      ...inner.map((p) => ({ id: p.id, label: `Servicio de ${p.name.replace(/^Servicio de /, "")}`, correct: true })),
      trap,
      NO_SE,
    ],
  };

  // 2 · Orden. La correcta se describe desde el camino feliz; los distractores lo invierten.
  const calls = happy.messages.filter((m) => !m.isReturn);
  const first = calls[1], second = calls[2];
  const q2: Question = {
    id: "q2",
    title: `Con esos servicios, ¿en qué orden ocurre ${a.feature.title.toLowerCase()}?`,
    hint: "Al elegir, se dibujan las flechas sobre las líneas que pusiste.",
    multi: false,
    needsText: false,
    panel: "diagram",
    options: [
      {
        id: "ok",
        label: first && second
          ? `El API ${first.label} a ${nameOf(a, first.to)}, después ${second.label} a ${nameOf(a, second.to)}, y responde`
          : "El API orquesta a los servicios y responde",
        correct: true,
      },
      {
        id: "inv",
        label: first && second
          ? `El API ${second.label} a ${nameOf(a, second.to)}, y ${nameOf(a, second.to)} consulta a ${nameOf(a, first.to)}`
          : "Un servicio llama al otro por su cuenta",
      },
      { id: "sep", label: "La App consulta a cada servicio por separado" },
      NO_SE,
    ],
  };

  // 3 · La frontera. Sale de decisions: se pregunta por el valor, nunca por el operador.
  const d = a.decisions[0];
  const q3: Question | null = d
    ? {
        id: "q3",
        title: d.question,
        hint: "Tu respuesta queda anotada sobre la flecha correspondiente.",
        multi: false,
        needsText: true,
        panel: "diagram",
        options: [
          ...d.alternatives.map((alt) => ({
            id: `alt-${alt}`,
            label: alt,
            correct: alt === d.actual,
          })),
          NO_SE,
        ],
      }
    : null;

  // 4 · Cobertura. El escenario es un camino sin prueba sustantiva que lo cubra.
  const uncovered = a.paths.find(
    (p) =>
      p.kind === "alternative" &&
      !a.tests.some((t) => t.substantive && t.covers.includes(p.id))
  );
  const q4: Question = {
    id: "q4",
    title: `Escenario: «${uncovered?.name ?? "un caso borde"}». ¿Cuál de estas pruebas lo cubre?`,
    hint: "Están descritas por lo que comprueban, no por el nombre que les puso quien las escribió.",
    multi: false,
    needsText: false,
    panel: "tests",
    options: [
      ...a.tests.map((t) => ({
        id: t.id,
        label: t.asserts,
        correct: !!uncovered && t.substantive && t.covers.includes(uncovered.id),
      })),
      { id: "none", label: "Ninguna de estas", correct: !a.tests.some((t) => t.substantive && uncovered && t.covers.includes(uncovered.id)) },
      NO_SE,
    ],
  };

  // 5 · Camino faltante. Sale de los paths marcados como "missing".
  const missing = a.paths.find((p) => p.kind === "missing");
  const q5: Question | null = missing
    ? {
        id: "q5",
        title: `${missing.name}: ¿qué hace el sistema?`,
        hint: "Un camino alternativo. Lo que elijas se agrega a tu diagrama.",
        multi: false,
        needsText: false,
        panel: "diagram",
        options: [
          { id: "degrada", label: "Responde igual, con el resultado degradado" },
          { id: "retry", label: "Reintenta y después falla con un error" },
          { id: "nada", label: "No está contemplado: la petición queda esperando", correct: true },
          NO_SE,
        ],
      }
    : null;

  return [q1, q2, q3, q4, q5].filter((q): q is Question => q !== null);
}
