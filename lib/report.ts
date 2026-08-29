import type { Analysis, Answer, Message, Question, Verdict } from "./types";
import { verdictFor } from "./scoring";

/**
 * Qué pregunta tocó cada mensaje del diagrama. Se deriva del análisis, no de una tabla fija:
 * - un servicio llamando a otro servicio es la dependencia escondida  -> pregunta de participantes
 * - el mensaje que cita la decisión                                   -> pregunta de la frontera
 * - los mensajes de un camino "missing"                               -> pregunta del camino faltante
 * - el resto del camino feliz                                         -> pregunta del orden
 */
export function questionForMessage(m: Message, pathKind: string, a: Analysis): string | null {
  if (pathKind === "missing") return "q5";
  if (a.decisions.some((d) => d.evidence === m.evidence)) return "q3";
  const inner = new Set(a.participants.filter((p) => p.id !== "app" && p.id !== "api").map((p) => p.id));
  if (inner.has(m.from) && inner.has(m.to)) return "q1";
  return "q2";
}

export function feedbackFor(qid: string, a: Analysis): string {
  const inner = a.participants.filter((p) => p.id !== "app" && p.id !== "api");
  const hidden = a.paths
    .flatMap((p) => p.messages)
    .find((m) => inner.some((i) => i.id === m.from) && inner.some((i) => i.id === m.to));
  const d = a.decisions[0];
  const missing = a.paths.find((p) => p.kind === "missing");
  const hollow = a.tests.filter((t) => !t.substantive);

  switch (qid) {
    case "q1":
      return hidden
        ? `Participan ${inner.map((p) => p.name).join(", ")}. ${a.participants.find((p) => p.id === hidden.from)?.name} llama a ${a.participants.find((p) => p.id === hidden.to)?.name}, así que hay una dependencia más de la que se ve desde el controlador.`
        : `Participan ${inner.map((p) => p.name).join(", ")}.`;
    case "q2":
      return "El API orquesta: pide cada pieza en orden y arma la respuesta. Ningún servicio llama a otro por su cuenta salvo donde el código lo dice explícitamente.";
    case "q3":
      return d ? `El valor real es ${d.actual}, según ${d.evidence}.` : "";
    case "q4":
      return hollow.length
        ? `Ninguna prueba cubre ese caso. Una se acerca pero usa otro valor, y ${hollow.length === 1 ? "otra" : "otras"} solo comprueba que la respuesta no sea nula: pasa aunque se rompa el comportamiento entero.`
        : "Ninguna prueba cubre ese caso.";
    case "q5":
      return missing
        ? `No está contemplado: ${missing.messages[missing.messages.length - 1]?.label ?? "la petición queda esperando"}. Es el camino que menos gente revisa y el que más rápido se nota en producción.`
        : "";
    default:
      return "";
  }
}

/** Hipótesis, nunca afirmaciones: el sistema no puede saber cuál es cierta. */
export const CAUSES: Record<string, string> = {
  q1: "· La IA agregó esa dependencia por su cuenta y nadie la revisó al aprobar.\n· Sí se pidió, pero en un ticket que no viste.\n· Conocías el servicio y no lo asociaste a este flujo.",
  q2: "· El orden se dedujo del nombre de los servicios y no del código.\n· Confundiste este flujo con otro del mismo repo.",
  q3: "· La spec que recordabas decía otra cosa y la implementación no la respeta.\n· El valor cambió después y nadie actualizó lo que le pasaste a la IA.",
  q4: "· Los nombres de las pruebas prometen más de lo que sus aserciones comprueban.\n· Nadie pidió cobertura del caso borde al escribir el feature.",
  q5: "· Nunca se pidió el comportamiento ante fallos, así que la IA no lo implementó.\n· Asumiste que el cliente ya trae un timeout por defecto.",
};

export function evidenceFor(qid: string, a: Analysis): { ref: string; code: string } | null {
  const inner = a.participants.filter((p) => p.id !== "app" && p.id !== "api");
  const hidden = a.paths
    .flatMap((p) => p.messages)
    .find((m) => inner.some((i) => i.id === m.from) && inner.some((i) => i.id === m.to));
  const refs: Record<string, string | undefined> = {
    q1: hidden?.evidence,
    q2: a.paths.find((p) => p.kind === "happy")?.messages[1]?.evidence,
    q3: a.decisions[0]?.evidence,
    q4: a.tests.find((t) => !t.substantive)?.file,
    q5: a.paths.find((p) => p.kind === "missing")?.messages.slice(-1)[0]?.evidence,
  };
  const ref = refs[qid];
  if (!ref) return null;
  return { ref, code: a.snippets[ref] ?? "// el fragmento llega con la ingesta del diff" };
}

export function buildPrompt(qs: Question[], answers: Record<string, Answer>, a: Analysis): string {
  const missed = (id: string) => {
    const v = verdictFor(qs.find((q) => q.id === id)!, answers[id]);
    return v === "red" || v === "yellow" || v === "grey";
  };
  const lines: string[] = [];
  const inner = a.participants.filter((p) => p.id !== "app" && p.id !== "api");
  const hidden = a.paths
    .flatMap((p) => p.messages)
    .find((m) => inner.some((i) => i.id === m.from) && inner.some((i) => i.id === m.to));

  if (missed("q1") && hidden) {
    lines.push(
      `${lines.length + 1}. ${a.participants.find((p) => p.id === hidden.from)?.name} llama a ${a.participants.find((p) => p.id === hidden.to)?.name}. Explícame de dónde salió esa dependencia y qué prueba la respalda.`
    );
  }
  const d = a.decisions[0];
  if (missed("q3") && d) {
    lines.push(`${lines.length + 1}. ${d.question} El código dice ${d.actual}. Dime cuál es el comportamiento correcto y quién lo decidió.`);
  }
  const missing = a.paths.find((p) => p.kind === "missing");
  if (missed("q5") && missing) {
    lines.push(`${lines.length + 1}. ${missing.name}: no hay timeout ni fallback. Propón qué debería pasar en ese camino.`);
  }
  if (lines.length === 0) {
    lines.push("1. Revisé este PR y no encontré huecos. Confirma que los casos borde y los caminos de fallo están realmente contemplados.");
  }

  return [
    `Sobre ${a.feature.title.toLowerCase()}, hay cosas que quiero entender antes de mergear:`,
    "",
    lines.join("\n\n"),
    "",
    "No cambies código todavía. Primero respóndeme.",
  ].join("\n");
}

export function adviceFor(counts: Record<Verdict, number>): string {
  if (!counts.red && !counts.yellow) {
    return "Reconociste las dependencias, el valor real y el camino sin cubrir. Mantén el hábito: antes de aprobar, pregunta siempre de dónde salió cada pieza del flujo.";
  }
  return "Contestaste desde la spec que recordabas, no desde el comportamiento del sistema. Cuando la IA implementa, el código es la fuente de verdad. Antes de confirmar, pregunta qué entró al flujo y qué pasa cuando algo falla.";
}

/** Nombres reales del ecosistema. Nunca inventar: si el jurado busca una y no existe, se quema. */
export function skillsFor(counts: Record<Verdict, number>) {
  const out: { id: string; why: string; color: string }[] = [];
  if (counts.red) {
    out.push({ id: "obra/superpowers@receiving-code-review", why: "Salió un punto ciego confirmado. 179.6K instalaciones.", color: "#c0392f" });
  }
  if (counts.yellow || !counts.red) {
    out.push({ id: "product-on-purpose/pm-skills@deliver-acceptance-criteria", why: "Caminos sin criterio de aceptación ni prueba. 831 instalaciones.", color: "#a87515" });
  }
  out.push({ id: "refoundai/lenny-skills@writing-specs-designs", why: "Área producto: specs que no dejan huecos. 1.8K instalaciones.", color: "#2563b0" });
  return out.slice(0, 3);
}
