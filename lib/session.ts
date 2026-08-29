/**
 * La salida de una sesión: las preguntas, las respuestas y el Mermaid, en un solo objeto.
 *
 * Es lo que se descarga, lo que devuelve /api/session y lo que pinta el reporte. Función
 * pura y sin acceso a disco: corre igual en el servidor y en el cliente, y no depende de
 * ningún estado de React.
 *
 * Nada acá afirma que la IA alucinó. Se registra la divergencia entre el dev y el código,
 * y las causas se ofrecen como hipótesis. Ver CLAUDE.md y docs/spec/02-reporte.md
 */

import type { Analysis, Answer, Question, Verdict } from "./types";
import { UNSURE, VERDICT_META, headline, tally, verdictFor } from "./scoring";
import {
  mermaidForAnalysis,
  mermaidForDev,
  mermaidForPath,
  type MermaidDiagram,
} from "./mermaid";
import { devDiagram } from "./dev-diagram";
import {
  CAUSES,
  adviceFor,
  buildPrompt,
  evidenceFor,
  feedbackFor,
  questionForMessage,
  skillsFor,
} from "./report";

export type OutputOption = { id: string; label: string; correct: boolean };

export type OutputQuestion = {
  id: string;
  title: string;
  hint: string;
  multi: boolean;
  /** El porqué en texto es obligatorio en las preguntas 1 y 3. */
  needsText: boolean;
  panel: Question["panel"];
  options: OutputOption[];
  /** Las opciones correctas, por etiqueta. Lo que el código dice. */
  expected: string[];
};

export type OutputAnswer = {
  id: string;
  question: string;
  /** Ids elegidos. `ns` es «No sé». */
  picks: string[];
  chose: string[];
  /** true = «Lo confirmo», false = «Prefiero revisarlo», null = no aplica. */
  confirmed: boolean | null;
  /** El porqué, literal. */
  text: string;
  verdict: Verdict;
  verdictLabel: string;
  color: string;
  correct: boolean;
  expected: string[];
  /** Qué hace el código, en lenguaje de negocio. */
  product: string;
  /** Por qué pueden diferir. Solo cuando hay divergencia — en verde y azul es ruido. */
  hypotheses: string[] | null;
  evidence: { ref: string; code: string } | null;
};

export type OutputMermaid = {
  /** La secuencia del código, un diagrama por camino. */
  code: MermaidDiagram[];
  /** La misma secuencia, pintada por corrección × confianza. */
  painted: MermaidDiagram[];
  /** El diagrama que construyó el dev con sus respuestas. */
  dev: string;
  /** Qué color significa qué, para leer los bloques pintados. */
  legend: { verdict: Verdict; label: string; color: string }[];
};

export type OutputPr = {
  url: string;
  title: string;
  author: string;
  state: string;
  baseRef: string;
  headRef: string;
  headSha: string;
  behindBy: number | null;
};

export type SessionOutput = {
  version: 1;
  generatedAt: string;
  pr: OutputPr | null;
  feature: Analysis["feature"];
  questions: OutputQuestion[];
  answers: OutputAnswer[];
  mermaid: OutputMermaid;
  verdict: {
    counts: Record<Verdict, number>;
    worst: Verdict;
    headline: string;
  };
  takeaways: {
    /** Pide cuentas, no arreglos. */
    prompt: string;
    advice: string;
    skills: { id: string; why: string }[];
  };
};

function labelsOf(q: Question, ids: string[]): string[] {
  return ids.map((id) => q.options.find((o) => o.id === id)?.label ?? id);
}

function expectedOf(q: Question): string[] {
  return q.options.filter((o) => o.correct).map((o) => o.label);
}

export function buildSessionOutput({
  analysis,
  questions,
  answers,
  pr = null,
  now = new Date(),
}: {
  analysis: Analysis;
  questions: Question[];
  answers: Record<string, Answer>;
  pr?: OutputPr | null;
  now?: Date;
}): SessionOutput {
  const counts = tally(questions, answers);
  const worst: Verdict = counts.red
    ? "red"
    : counts.yellow
      ? "yellow"
      : counts.blue
        ? "blue"
        : counts.green
          ? "green"
          : "grey";

  const colorFor = (qid: string): string => {
    const q = questions.find((x) => x.id === qid);
    return VERDICT_META[q ? verdictFor(q, answers[qid]) : "grey"].color;
  };

  const outQuestions: OutputQuestion[] = questions.map((q) => ({
    id: q.id,
    title: q.title,
    hint: q.hint,
    multi: q.multi,
    needsText: q.needsText,
    panel: q.panel,
    options: q.options.map((o) => ({ id: o.id, label: o.label, correct: !!o.correct })),
    expected: expectedOf(q),
  }));

  const outAnswers: OutputAnswer[] = questions.map((q) => {
    const a = answers[q.id];
    const verdict = verdictFor(q, a);
    const diverges = verdict === "red" || verdict === "yellow" || verdict === "grey";
    return {
      id: q.id,
      question: q.title,
      picks: a?.picks ?? [],
      chose: a ? labelsOf(q, a.picks) : [],
      confirmed: a?.confirmed ?? null,
      text: a?.text.trim() ?? "",
      verdict,
      verdictLabel: VERDICT_META[verdict].label,
      color: VERDICT_META[verdict].color,
      correct: verdict === "green" || verdict === "blue",
      expected: expectedOf(q),
      product: feedbackFor(q.id, analysis),
      hypotheses:
        diverges && CAUSES[q.id]
          ? CAUSES[q.id].split("\n").map((l) => l.replace(/^·\s*/, ""))
          : null,
      evidence: evidenceFor(q.id, analysis),
    };
  });

  // Cada mensaje toma el color de la pregunta que lo tocó; lo que ninguna tocó queda gris.
  const painted: MermaidDiagram[] = analysis.paths.map((path) => ({
    pathId: path.id,
    name: path.name,
    kind: path.kind,
    diagram: mermaidForPath(analysis, path, (m) => {
      const qid = questionForMessage(m, path.kind, analysis);
      return qid ? colorFor(qid) : VERDICT_META.grey.color;
    }),
  }));

  const dev = devDiagram(analysis, answers);

  return {
    version: 1,
    generatedAt: now.toISOString(),
    pr,
    feature: analysis.feature,
    questions: outQuestions,
    answers: outAnswers,
    mermaid: {
      code: mermaidForAnalysis(analysis),
      painted,
      dev: mermaidForDev({
        actors: dev.actors.map((a) => ({ id: a.id, name: a.name })),
        arrows: dev.messages.map((m) => ({
          from: m.from,
          to: m.to,
          label: m.label,
          isReturn: m.isReturn,
        })),
      }),
      legend: (["green", "blue", "red", "yellow", "grey"] as const).map((v) => ({
        verdict: v,
        label: VERDICT_META[v].label,
        color: VERDICT_META[v].color,
      })),
    },
    verdict: { counts, worst, headline: headline(counts) },
    takeaways: {
      prompt: buildPrompt(questions, answers, analysis),
      advice: adviceFor(counts),
      skills: skillsFor(counts).map((s) => ({ id: s.id, why: s.why })),
    },
  };
}

/** Las respuestas tal como viajan por la red: el `Record` del cliente, validado. */
export function parseAnswers(raw: unknown): Record<string, Answer> {
  const out: Record<string, Answer> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const v = value as Partial<Answer>;
    out[id] = {
      picks: Array.isArray(v.picks) ? v.picks.filter((p): p is string => typeof p === "string") : [],
      confirmed: typeof v.confirmed === "boolean" ? v.confirmed : undefined,
      text: typeof v.text === "string" ? v.text : "",
    };
  }
  return out;
}

export { UNSURE };
