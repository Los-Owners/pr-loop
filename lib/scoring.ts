import type { Answer, Question, Verdict } from "./types";

export const UNSURE = "ns";

export const VERDICT_META: Record<Verdict, { label: string; color: string; tint: string }> = {
  green:  { label: "Ownership real",        color: "#1F7A4C", tint: "#EAF4EE" },
  blue:   { label: "Acertó sin confirmar",  color: "#2563B0", tint: "#EBF1FA" },
  red:    { label: "Punto ciego",           color: "#C0392F", tint: "#FBECEA" },
  yellow: { label: "Sabe que no sabe",      color: "#A87515", tint: "#FBF3E3" },
  grey:   { label: "No evaluado",           color: "#A6A6B0", tint: "#F2F2F5" },
};

/**
 * Corrección × confianza. "No sé" cae siempre en amarillo: no puede ser correcto
 * y ya declara baja confianza, por eso no se le pide confirmación.
 */
export function verdictFor(q: Question, a: Answer | undefined): Verdict {
  if (!a || a.picks.length === 0) return "grey";
  if (a.picks.includes(UNSURE)) return "yellow";

  const expected = q.options.filter((o) => o.correct).map((o) => o.id);
  const right =
    expected.length === a.picks.length && expected.every((id) => a.picks.includes(id));

  if (right) return a.confirmed ? "green" : "blue";
  return a.confirmed ? "red" : "yellow";
}

/** El botón de confirmar solo aparece si hay respuesta y no es "No sé". */
export function needsConfirmation(a: Answer | undefined): boolean {
  return !!a && a.picks.length > 0 && !a.picks.includes(UNSURE);
}

export function isReady(q: Question, a: Answer | undefined): boolean {
  if (!a || a.picks.length === 0) return false;
  if (needsConfirmation(a) && a.confirmed === undefined) return false;
  if (q.needsText && a.text.trim().length === 0) return false;
  return true;
}

export function tally(qs: Question[], answers: Record<string, Answer>) {
  const counts: Record<Verdict, number> = { green: 0, blue: 0, red: 0, yellow: 0, grey: 0 };
  for (const q of qs) counts[verdictFor(q, answers[q.id])] += 1;
  return counts;
}

export function headline(counts: Record<Verdict, number>): string {
  if (counts.red > 1) return `Confirmaste ${counts.red} respuestas que el código contradice.`;
  if (counts.red === 1) return "Confirmaste una respuesta que el código contradice.";
  if (counts.yellow > 1) return "Hay partes de este feature que todavía no conoces.";
  return "Este feature lo posees.";
}
