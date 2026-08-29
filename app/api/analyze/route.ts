import { NextResponse } from "next/server";
import { analyze, AnalyzerError } from "@/lib/analyzer";
import { loadSkills } from "@/lib/analyzer/skills";
import { fetchPr, GitHubError, type PrSource } from "@/lib/github";
import { buildQuestions } from "@/lib/questions";
import { mermaidForAnalysis } from "@/lib/mermaid";
import type { OutputPr } from "@/lib/session";

/** El análisis tarda minutos: sin esto la función se corta antes de terminar. */
export const maxDuration = 300;

type Body = {
  /** URL de un PR público. Es el camino de CU-01. */
  url?: string;
  /** Alternativa para pruebas y fixtures: el diff ya resuelto. */
  diff?: string;
  files?: Record<string, string>;
  title?: string;
};

/**
 * Las fases reales del análisis. No hay ninguna inventada: cada una empieza cuando empieza
 * el trabajo y se cierra cuando ese trabajo terminó de verdad, así el check que ve el dev
 * significa algo. Ver components/Scan.tsx
 */
export type Phase = {
  id: "github" | "model" | "derive";
  status: "start" | "progress" | "done";
  detail?: string;
  /** Secciones del contrato que el modelo ya emitió. Solo en la fase del modelo. */
  sections?: string[];
};

function prOf(source: PrSource): OutputPr {
  return {
    url: source.url,
    title: source.title,
    author: source.author,
    state: source.state,
    baseRef: source.baseRef,
    headRef: source.headRef,
    headSha: source.headSha,
    behindBy: source.behindBy,
  };
}

class BadRequest extends Error {}

/** El pipeline completo, avisando por dónde va. Lo comparten el camino JSON y el SSE. */
async function run(body: Body, emit: (phase: Phase) => void) {
  let input: { diff: string; files?: Record<string, string>; title?: string };
  let pr: OutputPr | null = null;
  let ingest: { skipped: PrSource["skipped"]; morePages: boolean } | null = null;

  if (typeof body.url === "string" && body.url.trim()) {
    emit({ id: "github", status: "start" });
    const source = await fetchPr(body.url);
    input = { diff: source.diff, files: source.files, title: source.title };
    pr = prOf(source);
    ingest = { skipped: source.skipped, morePages: source.morePages };
    const count = Object.keys(source.files).length;
    emit({
      id: "github",
      status: "done",
      detail:
        `${count} ${count === 1 ? "archivo leído" : "archivos leídos"} en el HEAD del PR` +
        (source.skipped.length ? `, ${source.skipped.length} omitidos` : ""),
    });
  } else if (typeof body.diff === "string" && body.diff.trim()) {
    input = { diff: body.diff, files: body.files, title: body.title };
    emit({ id: "github", status: "done", detail: "el cambio llegó ya resuelto" });
  } else {
    throw new BadRequest("Falta la URL del PR.");
  }

  emit({ id: "model", status: "start" });
  const result = await analyze(input, (progress) =>
    emit({ id: "model", status: "progress", sections: progress.sections }),
  );
  const missing = result.analysis.paths.filter((p) => p.kind === "missing").length;
  emit({
    id: "model",
    status: "done",
    detail:
      `${result.analysis.participants.length} participantes, ${result.analysis.paths.length} caminos` +
      (missing ? ` (${missing} sin manejar)` : "") +
      `, ${result.analysis.tests.length} pruebas`,
  });

  // Las preguntas y el Mermaid salen del mismo JSON, con código normal: quien consuma este
  // endpoint ya se lleva la sesión entera sin tener que rearmarla.
  emit({ id: "derive", status: "start" });
  const questions = buildQuestions(result.analysis);
  const mermaid = mermaidForAnalysis(result.analysis);
  emit({
    id: "derive",
    status: "done",
    detail: `${questions.length} preguntas y ${mermaid.length} diagramas`,
  });

  return { ...result, pr, ingest, questions, mermaid, skills: loadSkills().filter((s) => s.role) };
}

function errorFor(error: unknown): { message: string; status: number } {
  if (error instanceof BadRequest) return { message: error.message, status: 400 };
  if (error instanceof GitHubError) return { message: error.message, status: 422 };
  if (error instanceof AnalyzerError) return { message: error.message, status: 422 };
  console.error("[analyze]", error);
  return { message: "El analizador falló.", status: 500 };
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  // Sin `Accept: text/event-stream` responde JSON de una vez, como antes: es lo que usa
  // scripts/check-fixture.mjs y cualquiera que consuma el endpoint sin UI.
  if (!request.headers.get("accept")?.includes("text/event-stream")) {
    try {
      return NextResponse.json(await run(body, () => {}));
    } catch (error) {
      const { message, status } = errorFor(error);
      return NextResponse.json({ error: message }, { status });
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        const result = await run(body, (phase) => send("phase", phase));
        send("result", result);
      } catch (error) {
        // Una vez abierto el stream ya no hay código de estado que cambiar: el error viaja
        // como un evento más y el cliente decide qué mostrar.
        send("error", { error: errorFor(error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
