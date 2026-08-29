/**
 * El diagrama que el dev construye con sus respuestas. Nunca el del código.
 *
 * Vive acá y no dentro de la pantalla de sesión porque lo consumen dos lugares: el panel
 * izquierdo mientras responde, y la salida de la sesión. Tienen que ser el mismo dibujo,
 * o el output estaría contando otra cosa que la que el dev vio.
 *
 * Todo se deriva del análisis: los ids de los participantes los pone el analizador según
 * el PR, así que nada acá puede estar escrito a mano contra un PR concreto.
 */

import type { Analysis, Answer } from "./types";
import { UNSURE } from "./scoring";

/** El servicio que no existe, colado entre las opciones de la pregunta 1. */
export const TRAP_ID = "__trap";
export const TRAP_NAME = "Inventario";

export type DevActor = { id: string; name: string; isNew?: boolean };
export type DevMessage = {
  from: string;
  to: string;
  label: string;
  isReturn?: boolean;
  color?: string;
  evidence?: string;
};

const AMBER = "#A87515";

/** Sin «Servicio de» delante: en una línea de vida el prefijo solo ocupa lugar. */
function shortName(name: string): string {
  return name.replace(/^Servicio de /i, "");
}

/** Los colaboradores, en el orden en que el camino feliz los toca. */
function orderedInner(analysis: Analysis): string[] {
  const inner = analysis.participants
    .filter((p) => p.id !== "app" && p.id !== "api")
    .map((p) => p.id);
  const happy = analysis.paths.find((p) => p.kind === "happy");
  const seen: string[] = [];
  for (const m of happy?.messages ?? []) {
    for (const id of [m.from, m.to]) {
      if (inner.includes(id) && !seen.includes(id)) seen.push(id);
    }
  }
  return [...seen, ...inner.filter((id) => !seen.includes(id)), TRAP_ID];
}

export function devDiagram(
  analysis: Analysis,
  answers: Record<string, Answer>,
  /** Marca como nuevas las líneas recién agregadas; solo mientras se responde la 1. */
  highlightNew = false,
): { actors: DevActor[]; messages: DevMessage[] } {
  const picked = (answers.q1?.picks ?? []).filter((p) => p !== UNSURE);
  const named = (id: string) =>
    id === TRAP_ID
      ? TRAP_NAME
      : shortName(analysis.participants.find((p) => p.id === id)?.name ?? id);

  const actors: DevActor[] = [
    { id: "app", name: shortName(analysis.participants.find((p) => p.id === "app")?.name ?? "App") },
    { id: "api", name: shortName(analysis.participants.find((p) => p.id === "api")?.name ?? "API") },
    ...orderedInner(analysis)
      .filter((id) => picked.includes(id))
      .map((id) => ({ id, name: named(id), isNew: highlightNew })),
  ];
  const known = new Set(actors.map((a) => a.id));

  const happy = analysis.paths.find((p) => p.kind === "happy");
  const orderPick = answers.q2?.picks[0];
  let messages: DevMessage[] = [];

  if (orderPick === "ok" && happy) {
    messages = happy.messages.filter((m) => known.has(m.from) && known.has(m.to));
  } else if (orderPick === "inv" && happy) {
    messages = [...happy.messages].reverse().filter((m) => known.has(m.from) && known.has(m.to));
  } else if (orderPick === "sep") {
    messages = actors
      .filter((a) => a.id !== "app")
      .map((a) => ({ from: "app", to: a.id, label: "consulta directa" }));
  }

  // La frontera elegida se anota sobre la flecha que cita la decisión.
  const threshold = answers.q3?.picks[0];
  if (threshold && threshold !== UNSURE) {
    const label = threshold.replace(/^alt-/, "");
    messages = messages.map((m) =>
      analysis.decisions.some((d) => d.evidence === m.evidence)
        ? { ...m, label: `${m.label} · ${label}` }
        : m,
    );
  }

  // El camino de caída se agrega en ámbar, saliendo del servicio que el código no maneja.
  const fall = answers.q5?.picks[0];
  const fallText: Record<string, string> = {
    degrada: "sin respuesta · responde degradado",
    retry: "sin respuesta · reintenta y falla",
    nada: "sin respuesta · queda esperando",
  };
  const missing = analysis.paths.find((p) => p.kind === "missing");
  const faller = missing?.messages.map((m) => m.to).find((id) => id !== "app" && id !== "api");
  if (fall && fallText[fall] && faller && known.has(faller)) {
    messages = [
      ...messages,
      { from: faller, to: "api", label: fallText[fall], isReturn: true, color: AMBER },
    ];
  }

  return { actors, messages };
}
