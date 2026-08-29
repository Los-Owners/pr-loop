/**
 * Las fases del análisis tal como las ve la UI. El servidor las emite por SSE desde
 * app/api/analyze/route.ts; acá solo se les pone nombre y se guarda su estado.
 */

export type PhaseId = "github" | "model" | "derive";

export type PhaseState = {
  label: string;
  status: "pending" | "running" | "done";
  detail?: string;
  /** Secciones del contrato que el modelo ya emitió. Solo en la fase del modelo. */
  sections?: string[];
};

/** Qué nombre lleva cada fase. En lenguaje de producto, como todo lo que ve el dev. */
export const PHASE_LABELS: Record<PhaseId, string> = {
  github: "Leyendo el PR y los archivos que toca",
  model: "Reconstruyendo los specs desde el código",
  derive: "Armando las preguntas y los diagramas",
};

export function initialPhases(): Record<PhaseId, PhaseState> {
  return {
    github: { label: PHASE_LABELS.github, status: "pending" },
    model: { label: PHASE_LABELS.model, status: "pending" },
    derive: { label: PHASE_LABELS.derive, status: "pending" },
  };
}

/** Un evento del servidor aplicado sobre el estado actual. */
export function applyPhase(
  phases: Record<PhaseId, PhaseState>,
  event: { id: PhaseId; status: "start" | "progress" | "done"; detail?: string; sections?: string[] },
): Record<PhaseId, PhaseState> {
  const current = phases[event.id];
  if (!current) return phases;
  return {
    ...phases,
    [event.id]: {
      ...current,
      status: event.status === "done" ? "done" : "running",
      detail: event.detail ?? current.detail,
      sections: event.sections ?? current.sections,
    },
  };
}
